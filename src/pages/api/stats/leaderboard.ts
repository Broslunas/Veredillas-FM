import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '../../../models/User';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) {
        return new Response(JSON.stringify({ error: 'Database configuration missing' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await mongoose.connect(MONGODB_URI);
    }

    // Find top 5 listeners with non-zero listening time
    const topListeners = await User.find({ listeningTime: { $gt: 0 } })
      .sort({ listeningTime: -1 })
      .limit(5)
      .select('name picture listeningTime _id')
      .lean();

    return new Response(JSON.stringify(topListeners), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=30'
      }
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch leaderboard' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
