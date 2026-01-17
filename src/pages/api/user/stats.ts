import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '../../../models/User';
import { getUserFromCookie } from '../../../lib/auth';

export const prerender = false;

// GET: Retrieve user stats (favorites count, listening time, etc.)
export const GET: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      listeningTime: user.listeningTime || 0,
      favoritesCount: user.favorites.length,
      favorites: user.favorites
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return new Response(JSON.stringify({ error: 'Internal User Error' }), { status: 500 });
  }
};

// POST: Update listening time
export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { increment } = await request.json();
    
    if (typeof increment !== 'number' || increment <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid increment value' }), { status: 400 });
    }

    // Cap increment to prevent massive updates (e.g. max 5 minutes at a time)
    if (increment > 300) {
         return new Response(JSON.stringify({ error: 'Increment too large' }), { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    const user = await User.findByIdAndUpdate(
        userPayload.userId,
        { $inc: { listeningTime: increment } },
        { new: true }
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      listeningTime: user.listeningTime
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating stats:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
