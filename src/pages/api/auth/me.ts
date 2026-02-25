import type { APIRoute } from 'astro';

import { getUserFromCookie } from '../../../lib/auth';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import crypto from 'crypto';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Obtener usuario del token
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conectar a MongoDB
    await dbConnect();

    // Buscar usuario completo en la base de datos
    const user = await User.findById(userPayload.userId).select('-__v');

    if (!user) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine picture URL: DB > Gravatar > Placeholder (handled by UI)
    let pictureUrl = user.picture;
    
    if (!pictureUrl && user.email) {
      const hash = crypto
        .createHash('md5')
        .update(user.email.trim().toLowerCase())
        .digest('hex');
      pictureUrl = `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
    }

    // --- STREAK LOGIC ---
    const now = new Date();
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
    
    const todayStr = now.toISOString().split('T')[0];
    const lastActiveStr = lastActive ? lastActive.toISOString().split('T')[0] : null;

    if (!lastActiveStr) {
      // First time active
      user.currentStreak = 1;
      user.maxStreak = 1;
      user.lastActiveAt = now;
      await user.save();
    } else if (todayStr !== lastActiveStr) {
      // It's a different day!
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActiveStr === yesterdayStr) {
        // Consecutive day!
        user.currentStreak += 1;
        if (user.currentStreak > user.maxStreak) {
          user.maxStreak = user.currentStreak;
        }
      } else {
        // Broke the streak, but active today
        user.currentStreak = 1;
      }
      user.lastActiveAt = now;
      await user.save();
    } else {
      // We only save if more than 5 mins passed to avoid excessive DB writes
      if (lastActive && now.getTime() - lastActive.getTime() > 5 * 60 * 1000) {
        user.lastActiveAt = now;
        await user.save();
      }
    }

    return new Response(JSON.stringify({ 
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: pictureUrl,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        lastActiveAt: user.lastActiveAt
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
