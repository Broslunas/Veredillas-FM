/**
 * @canariaseducacion.es Authentication Library
 *
 * Handles HMAC-SHA256 token validation and user creation/update
 * for Canary Islands educational institution accounts.
 *
 * Flow:
 *   1. User clicks "Acceso @canariaseducacion.es" on the login page
 *   2. A popup opens /auth/canariaseducacion/login
 *   3. That page redirects to the Google Apps Script bridge
 *   4. The bridge authenticates the user with their Google Workspace account
 *   5. On success, the bridge redirects to /api/auth/canariaseducacion/callback?email=...&token=...
 *   6. The callback validates the HMAC token, creates/updates the user, sets cookies, and notifies the opener
 */

import { createHmac, createHash } from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALLOWED_DOMAIN = '@canariaseducacion.es';

/**
 * The Google Apps Script bridge URL.
 * This Apps Script must be published and configured to use CANARIAS_EDUCACION_BRIDGE_SECRET
 * when signing the HMAC-SHA256 token it sends back.
 */
export const BRIDGE_SCRIPT_URL =
  'https://script.google.com/a/macros/canariaseducacion.es/s/AKfycbxKmcO1ylCFiw-R9FGNQ9CeO1tjCGJkhxR9XIp7BLEITmCWlQWzDkMsd7WPi3W_uvlR/exec';

// ─── Token Validation ──────────────────────────────────────────────────────────

/**
 * Generates an HMAC-SHA256 hex digest of the given email using the configured secret.
 * The Apps Script bridge must sign the email with the same secret.
 */
export function signEmail(email: string, secret: string): string {
  return createHmac('sha256', secret).update(email).digest('hex');
}

/**
 * Validates the token received from the Apps Script bridge.
 * Accepts both the original casing and a lowercase version of the email
 * to handle potential case mismatches between what Google sends and what we store.
 *
 * Returns true if the token is valid for the given email.
 */
export function isValidToken(rawEmail: string, token: string, secret: string): boolean {
  const expectedOriginal = signEmail(rawEmail, secret);
  const expectedLower = signEmail(rawEmail.trim().toLowerCase(), secret);
  return token === expectedOriginal || token === expectedLower;
}

/**
 * Validates that the email belongs to the allowed educational domain.
 */
export function isAllowedDomain(email: string): boolean {
  return email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
}

// ─── User Helpers ──────────────────────────────────────────────────────────────

/**
 * Generates a stable, virtual Google-style numeric ID from an email address.
 * Used to populate the `googleId` field for users who sign in via the bridge
 * (they don't have a real Google OAuth ID).
 */
export function generateVirtualGoogleId(email: string): string {
  const hex = createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  // Take first 12 hex chars → parse as base-16 int → stable numeric string
  return String(parseInt(hex.substring(0, 12), 16));
}

/**
 * Derives a display name from an educational email address.
 * E.g. "pablo.garcia@canariaseducacion.es" → "Pablo Garcia"
 */
export function nameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  return localPart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Returns a profile picture URL for the given email.
 * Tries Gravatar first; falls back to ui-avatars with the Veredillas FM brand colour.
 */
export async function resolveProfilePicture(email: string): Promise<string> {
  const normalised = email.trim().toLowerCase();
  const hash = createHash('md5').update(normalised).digest('hex');
  const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;

  try {
    const res = await fetch(gravatarUrl, { method: 'HEAD' });
    if (res.ok) {
      return `https://www.gravatar.com/avatar/${hash}`;
    }
  } catch {
    // Gravatar unreachable — use fallback
  }

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(normalised)}&background=8b5cf6&color=fff&size=200`;
}

// ─── Streak Logic ──────────────────────────────────────────────────────────────

/** Returns "YYYY-M-D" for a given Date (local, not UTC, to match user's day perception). */
export function dayString(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Calculates the new streak values given the user's previous activity date.
 *
 * Rules:
 * - Same calendar day → no change
 * - Consecutive day → streak +1
 * - Any other gap → streak resets to 1
 */
export function calculateStreak(
  now: Date,
  lastActiveAt: Date | null | undefined,
  currentStreak: number,
  maxStreak: number
): { currentStreak: number; maxStreak: number } {
  const todayStr = dayString(now);

  if (!lastActiveAt) {
    return { currentStreak: 1, maxStreak: Math.max(maxStreak, 1) };
  }

  const lastStr = dayString(new Date(lastActiveAt));

  if (todayStr === lastStr) {
    // Already active today — no change
    return { currentStreak, maxStreak };
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = dayString(yesterday);

  const newStreak = lastStr === yesterdayStr ? currentStreak + 1 : 1;
  return { currentStreak: newStreak, maxStreak: Math.max(maxStreak, newStreak) };
}
