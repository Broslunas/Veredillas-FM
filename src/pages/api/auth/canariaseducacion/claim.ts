/**
 * GET /api/auth/canariaseducacion/claim?id=<authId>
 *
 * Final step of the polling flow. The main tab navigates HERE once poll
 * returns { ready: true }. This endpoint:
 *   1. Finds and deletes the pending auth record (single-use)
 *   2. Creates or updates the user in MongoDB
 *   3. Sets session cookies
 *   4. Redirects to /dashboard
 */

import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { PendingCanariasAuth } from '@/models/PendingCanariasAuth';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import {
  generateVirtualGoogleId,
  nameFromEmail,
  resolveProfilePicture,
  calculateStreak,
} from '@/lib/canariaseducacion-auth';

export const prerender = false;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = import.meta.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const authId = url.searchParams.get('id');
  if (!authId) return new Response(null, { status: 302, headers: { Location: '/login?error=MissingParams' } });

  try {
    await connectDB();

    // Atomically find and delete — single-use claim
    const pending = await PendingCanariasAuth.findOneAndDelete({ authId });
    if (!pending) {
      console.warn('[CanariasAuth] claim: no pending auth for id', authId);
      return new Response(null, { status: 302, headers: { Location: '/login?error=ExpiredOrInvalid' } });
    }

    const email = pending.email as string;
    const now = new Date();
    const virtualGoogleId = generateVirtualGoogleId(email);
    const picture = await resolveProfilePicture(email);

    let user = await User.findOne({ email });

    if (!user) {
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

      // Notify n8n (non-blocking)
      fetch('https://n8n.broslunas.com/webhook/veredillasfm-new-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, email: user.email, source: 'canariaseducacion' }),
      }).catch((e) => console.error('[CanariasAuth] webhook error:', e));
    } else {
      const { currentStreak, maxStreak } = calculateStreak(
        now, user.lastActiveAt, user.currentStreak ?? 0, user.maxStreak ?? 0
      );
      user.currentStreak = currentStreak;
      user.maxStreak = maxStreak;
      user.lastLogin = now;
      user.lastActiveAt = now;
      if (!user.googleId) user.googleId = virtualGoogleId;
      if (!user.picture || user.picture.includes('ui-avatars.com')) user.picture = picture;
      await user.save();
    }

    const jwtToken = generateToken(user);
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    const domain = url.host.includes('veredillasfm.es') ? '.veredillasfm.es' : undefined;

    cookies.set('auth-token', jwtToken, { path: '/', domain, maxAge, httpOnly: true, secure: true, sameSite: 'lax' });
    cookies.set('user-session', 'true',  { path: '/', domain, maxAge, httpOnly: false, secure: true, sameSite: 'lax' });

    return new Response(null, { status: 302, headers: { Location: '/dashboard' } });

  } catch (err) {
    console.error('[CanariasAuth] claim error:', err);
    return new Response(null, { status: 302, headers: { Location: '/login?error=ServerError' } });
  }
};
