import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    let isLiked = false;
    let isDisliked = false;

    if (userPayload) {
      const user = await User.findById(userPayload.userId).select('likedEpisodes dislikedEpisodes');
      if (user) {
        if (user.likedEpisodes?.includes(slug)) isLiked = true;
        if (user.dislikedEpisodes?.includes(slug)) isDisliked = true;
      }
    }

    // In a real app we might count total likes across all users.
    // Let's implement that.
    const likesCount = await User.countDocuments({ likedEpisodes: slug });
    const dislikesCount = await User.countDocuments({ dislikedEpisodes: slug });

    return new Response(JSON.stringify({ 
      isLiked,
      isDisliked,
      likesCount,
      dislikesCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching interaction status:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
