/**
 * GET /api/auth/canariaseducacion/callback
 *
 * Receives the authenticated user data from the Google Apps Script bridge
 * and establishes a Veredillas FM session.
 *
 * Expected query params (sent by the Apps Script):
 *   - email  — The user's @canariaseducacion.es email address
 *   - token  — HMAC-SHA256(email, CANARIAS_EDUCACION_BRIDGE_SECRET)
 *
 * On success: returns an HTML page that sets session cookies, signals the
 * opener (parent window) that authentication is complete, and closes itself.
 *
 * On failure: redirects to /login with a descriptive error code.
 */

import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import {
  isValidToken,
  isAllowedDomain,
  generateVirtualGoogleId,
  nameFromEmail,
  resolveProfilePicture,
  calculateStreak,
} from '@/lib/canariaseducacion-auth';

export const prerender = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  const uri = import.meta.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  await mongoose.connect(uri);
}

function getSharedDomain(host: string): string | undefined {
  // Share the session cookie across www.veredillasfm.es and veredillasfm.es
  return host.includes('veredillasfm.es') ? '.veredillasfm.es' : undefined;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ url, cookies }) => {
  const rawEmail = url.searchParams.get('email');
  const token = url.searchParams.get('token');

  // ── 1. Presence check ──────────────────────────────────────────────────────
  if (!rawEmail || !token) {
    return Response.redirect(new URL('/login?error=MissingParams', url));
  }

  const email = rawEmail.trim().toLowerCase();
  const secret = import.meta.env.CANARIAS_EDUCACION_BRIDGE_SECRET;

  if (!secret) {
    console.error('[CanariasAuth] CANARIAS_EDUCACION_BRIDGE_SECRET is not set');
    return Response.redirect(new URL('/login?error=ServerConfig', url));
  }

  // ── 2. Domain check (first so we fail fast before crypto) ──────────────────
  if (!isAllowedDomain(email)) {
    console.warn('[CanariasAuth] Rejected non-educational email:', email);
    return Response.redirect(new URL('/login?error=InvalidDomain', url));
  }

  // ── 3. HMAC token validation ───────────────────────────────────────────────
  if (!isValidToken(rawEmail, token, secret)) {
    console.error('[CanariasAuth] Invalid HMAC token for:', email);
    return Response.redirect(new URL('/login?error=InvalidToken', url));
  }

  // ── 4. Database operations ─────────────────────────────────────────────────
  try {
    await connectDB();

    const now = new Date();
    const virtualGoogleId = generateVirtualGoogleId(email);
    const picture = await resolveProfilePicture(email);

    let user = await User.findOne({ email });

    if (!user) {
      // ── New user ────────────────────────────────────────────────────────────
      user = await User.create({
        googleId: virtualGoogleId,
        email,
        name: nameFromEmail(email),
        picture,
        lastLogin: now,
        lastActiveAt: now,
        currentStreak: 1,
        maxStreak: 1,
        role: 'user',
      });

      // Notify n8n webhook about new registration (non-blocking)
      fetch('https://n8n.broslunas.com/webhook/veredillasfm-new-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          source: 'canariaseducacion',
        }),
      }).catch((err) => console.error('[CanariasAuth] Webhook error:', err));
    } else {
      // ── Returning user ──────────────────────────────────────────────────────
      const { currentStreak: newStreak, maxStreak: newMax } = calculateStreak(
        now,
        user.lastActiveAt,
        user.currentStreak ?? 0,
        user.maxStreak ?? 0
      );

      user.currentStreak = newStreak;
      user.maxStreak = newMax;
      user.lastLogin = now;
      user.lastActiveAt = now;

      // Back-fill googleId if it was never set (avoids future E11000 duplicate key errors)
      if (!user.googleId) {
        user.googleId = virtualGoogleId;
      }

      // Only update picture if the user still has an auto-generated avatar
      if (!user.picture || user.picture.includes('ui-avatars.com')) {
        user.picture = picture;
      }

      await user.save();
    }

    // ── 5. Issue JWT session cookies ──────────────────────────────────────────
    const jwtToken = generateToken(user);
    const maxAge = 60 * 60 * 24 * 30; // 30 days in seconds
    const domain = getSharedDomain(url.host);

    cookies.set('auth-token', jwtToken, {
      path: '/',
      domain,
      maxAge,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    // A non-httpOnly flag so client JS can detect an active session without
    // reading the sensitive JWT directly.
    cookies.set('user-session', 'true', {
      path: '/',
      domain,
      maxAge,
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
    });

    // ── 6. Return success HTML ────────────────────────────────────────────────
    //
    // We return HTML instead of a redirect so we can:
    //   a) Break out of any potential iframe the Apps Script may have used
    //   b) Signal the opener window via postMessage + localStorage
    //   c) Auto-close the popup and redirect the main tab to /dashboard

    const html = buildSuccessPage(user.name);

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[CanariasAuth] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.redirect(new URL(`/login?error=ServerError&detail=${encodeURIComponent(message)}`, url));
  }
};

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildSuccessPage(userName: string): string {
  // Escape the name to prevent XSS (name comes from the email local part, but
  // let's be safe in case the DB record has been tampered with).
  const safeName = userName.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
  );

  return /* html */ `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sesión iniciada — Veredillas FM</title>
    <!--
      FRAME-BREAKER (critical):
      If the Apps Script placed us inside an iframe, cookies with SameSite=Lax
      won't be sent by the browser on subsequent requests. We force the top-level
      window to replace its URL with ours so the page runs in a proper top-level
      browsing context.
    -->
    <script>
      if (window.top !== window.self) {
        window.top.location.replace(window.location.href);
      }
    <\/script>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        background: #0a0a14;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 2rem;
      }

      .card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 1.5rem;
        padding: 3rem 2.5rem;
        text-align: center;
        max-width: 380px;
        width: 100%;
        backdrop-filter: blur(20px);
        box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6);
        animation: fade-in 0.4s ease both;
      }

      @keyframes fade-in {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .icon {
        font-size: 2.5rem;
        margin-bottom: 1.25rem;
        display: block;
        animation: pop 0.5s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      }

      @keyframes pop {
        from { transform: scale(0.5); opacity: 0; }
        to   { transform: scale(1); opacity: 1; }
      }

      .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(139, 92, 246, 0.15);
        border-top-color: #8b5cf6;
        border-radius: 50%;
        animation: spin 0.9s linear infinite;
        margin: 0 auto 1.5rem;
      }

      @keyframes spin { to { transform: rotate(360deg); } }

      h1 {
        font-size: 1.35rem;
        font-weight: 800;
        background: linear-gradient(135deg, #fff, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
      }

      p {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.4);
        line-height: 1.6;
        margin-bottom: 2rem;
      }

      .btn {
        display: block;
        width: 100%;
        padding: 0.85rem 1.5rem;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: #fff;
        border: none;
        border-radius: 0.75rem;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        transition: filter 0.2s, transform 0.2s;
        box-shadow: 0 8px 20px -6px rgba(124, 58, 237, 0.5);
        text-decoration: none;
      }

      .btn:hover {
        filter: brightness(1.1);
        transform: translateY(-2px);
      }
    </style>
</head>
<body>
  <div class="card">
    <span class="icon">✅</span>
    <div class="spinner"></div>
    <h1>¡Bienvenido, ${safeName}!</h1>
    <p>Tu sesión se ha iniciado correctamente. Esta ventana se cerrará automáticamente.</p>
    <button class="btn" onclick="finish()">Entrar al dashboard</button>
  </div>

  <script>
    // Only run the opener-communication logic when we are the top-level frame
    // (the frame-breaker script above ensures this by the time we reach here).
    if (window.top === window.self) {

      /**
       * Signal the parent window and close the popup.
       *
       * We use two mechanisms for maximum cross-browser reliability:
       *   1. postMessage  — works reliably when opener is same-origin.
       *   2. localStorage — works even when postMessage is blocked.
       */
      function finish() {
        // Write the "done" signal before attempting to communicate
        try { localStorage.setItem('canarian_auth_done', String(Date.now())); } catch (_) {}

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: 'canarian_auth_success' }, window.location.origin);
            window.opener.location.href = '/dashboard';
          } catch (_) {
            // Opener is cross-origin or inaccessible — the localStorage watcher
            // in the main page will handle the redirect instead.
          }
        }

        window.close();

        // Fallback: if window.close() is blocked (user opened page directly),
        // redirect this tab to the dashboard.
        setTimeout(() => {
          if (!window.closed) window.location.href = '/dashboard';
        }, 500);
      }

      // Auto-finish after 1.5 s so the user can read the success message
      setTimeout(finish, 1500);
    }
  <\/script>
</body>
</html>`;
}
