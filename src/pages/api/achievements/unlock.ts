// POST /api/achievements/unlock — Manually unlock a specific achievement (for special/secret ones)
import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import mongoose from 'mongoose';
import User from '../../../models/User';
import UserAchievement from '../../../models/UserAchievement';
import { getAchievementById } from '../../../lib/achievements';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { achievementId } = body;

    if (!achievementId || typeof achievementId !== 'string') {
      return new Response(JSON.stringify({ error: 'achievementId required' }), { status: 400 });
    }

    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      return new Response(JSON.stringify({ error: 'Achievement not found' }), { status: 404 });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
      await mongoose.connect(MONGODB_URI);
    }

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Insert only if not already present
    const existing = await UserAchievement.findOne({
      userId: user._id,
      achievementId,
    });

    if (existing) {
      return new Response(
        JSON.stringify({ message: 'Already unlocked', alreadyHad: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await UserAchievement.create({
      userId: user._id,
      achievementId,
      unlockedAt: new Date(),
    });

    return new Response(
      JSON.stringify({ message: 'Achievement unlocked!', achievement }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[achievements unlock POST]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
