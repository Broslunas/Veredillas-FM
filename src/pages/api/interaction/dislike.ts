import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

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

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    const { episodeSlug } = await request.json();

    if (!episodeSlug || typeof episodeSlug !== 'string') {
      return new Response(JSON.stringify({ error: 'Episode slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let likedEpisodes = user.likedEpisodes || [];
    let dislikedEpisodes = user.dislikedEpisodes || [];
    
    const isCurrentlyDisliked = dislikedEpisodes.includes(episodeSlug);
    let isNowDisliked = false;

    if (isCurrentlyDisliked) {
      // Remove dislike
      dislikedEpisodes = dislikedEpisodes.filter((slug: string) => slug !== episodeSlug);
    } else {
      // Add dislike and remove like if any
      dislikedEpisodes.push(episodeSlug);
      likedEpisodes = likedEpisodes.filter((slug: string) => slug !== episodeSlug);
      isNowDisliked = true;
    }

    await User.findByIdAndUpdate(
      userPayload.userId,
      { $set: { likedEpisodes, dislikedEpisodes } }
    );

    return new Response(JSON.stringify({ 
      success: true,
      isDisliked: isNowDisliked,
      isLiked: false // Since we just disliked, it can't be liked
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error toggling dislike:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
