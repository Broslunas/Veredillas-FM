import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '@/lib/auth';
import EpisodeReaction from '@/models/EpisodeReaction';

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

    const userId = userPayload.userId;

    // Check existing reaction
    const existing = await EpisodeReaction.findOne({ userId, episodeSlug });

    let isLiked = false;
    let isDisliked = false;

    if (existing) {
      if (existing.type === 'like') {
        // Toggle off
        await EpisodeReaction.deleteOne({ _id: existing._id });
        isLiked = false;
      } else {
        // Switch dislike to like
        existing.type = 'like';
        await existing.save();
        isLiked = true;
      }
    } else {
      // Create new like
      await EpisodeReaction.create({ userId, episodeSlug, type: 'like' });
      isLiked = true;
    }

    return new Response(JSON.stringify({ 
      success: true,
      isLiked,
      isDisliked
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error toggling like:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
