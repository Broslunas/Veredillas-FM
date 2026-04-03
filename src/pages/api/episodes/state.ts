import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import EpisodeReaction from '../../../models/EpisodeReaction';

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

    // Parallel fetch for global states
    const [likesCount, dislikesCount, favoritesCount] = await Promise.all([
      EpisodeReaction.countDocuments({ episodeSlug: slug, type: 'like' }),
      EpisodeReaction.countDocuments({ episodeSlug: slug, type: 'dislike' }),
      User.countDocuments({ favorites: slug })
    ]);

    let isFavorite = false;
    let isLiked = false;
    let isDisliked = false;

    // Check user state if logged in
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (userPayload) {
      const [user, reaction] = await Promise.all([
        User.findById(userPayload.userId).select('favorites'),
        EpisodeReaction.findOne({ userId: userPayload.userId, episodeSlug: slug })
      ]);

      if (user && user.favorites?.includes(slug)) {
        isFavorite = true;
      }
      if (reaction) {
        if (reaction.type === 'like') isLiked = true;
        if (reaction.type === 'dislike') isDisliked = true;
      }
    }

    return new Response(JSON.stringify({ 
      userState: {
        isFavorite,
        isLiked,
        isDisliked
      },
      globalStats: {
        favoritesCount,
        likesCount,
        dislikesCount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching episode state:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
