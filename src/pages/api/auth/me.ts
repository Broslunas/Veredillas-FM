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
    // Use local-friendly date string (Year-Month-Day)
    const getDayStr = (d: Date) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    
    const todayStr = getDayStr(now);
    const lastActiveStr = user.lastActiveAt ? getDayStr(new Date(user.lastActiveAt)) : null;

    let needsSave = false;

    if (!lastActiveStr) {
      // First time tracking activity or missing field
      console.log(`[Streak] Initializing for user ${user._id}`);
      user.currentStreak = 1;
      user.maxStreak = Math.max(user.maxStreak || 0, 1);
      user.lastActiveAt = now;
      needsSave = true;
    } else if (todayStr !== lastActiveStr) {
      // It's a new day!
      const lastDate = new Date(user.lastActiveAt);
      const diffTime = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      console.log(`[Streak] Day change detected. Diff days: ${diffDays}`);

      if (diffDays <= 1) {
        // Consecutive or near-consecutive (considering timezone shifts)
        // We verify if it was exactly 1 day ago
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (lastActiveStr === getDayStr(yesterday)) {
          user.currentStreak = (user.currentStreak || 0) + 1;
          console.log(`[Streak] +1! New streak: ${user.currentStreak}`);
        } else {
          // More than 24h gap
          user.currentStreak = 1;
          console.log(`[Streak] Gap too large, reset to 1`);
        }
      } else {
        // Definitely more than 1 day gap
        user.currentStreak = 1;
        console.log(`[Streak] Reset to 1 (gap > 1 day)`);
      }

      if (user.currentStreak > (user.maxStreak || 0)) {
        user.maxStreak = user.currentStreak;
      }
      user.lastActiveAt = now;
      needsSave = true;
    } else {
      // Same day activity
      // Ensure streak is at least 1 if they are active today
      if (!user.currentStreak || user.currentStreak === 0) {
        user.currentStreak = 1;
        user.maxStreak = Math.max(user.maxStreak || 0, 1);
        needsSave = true;
      }

      // Update timestamp every 5 mins
      const lastActiveAtTime = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
      if (now.getTime() - lastActiveAtTime > 5 * 60 * 1000) {
        user.lastActiveAt = now;
        needsSave = true;
      }
    }

    if (needsSave) {
      await user.save();
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
