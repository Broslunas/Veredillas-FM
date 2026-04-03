import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '../../../models/User';

export const prerender = false;

/**
 * Obtiene el número total de usuarios que han marcado un episodio como favorito
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const episodeSlug = url.searchParams.get('slug');

    if (!episodeSlug) {
      return new Response(JSON.stringify({ error: 'Episode slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conectar a MongoDB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI not configured');
      }
      await mongoose.connect(MONGODB_URI);
    }

    // Contar cuántos usuarios tienen este episodio en favoritos
    const count = await User.countDocuments({
      favorites: episodeSlug
    });

    return new Response(JSON.stringify({ 
      episodeSlug,
      favoritesCount: count
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting favorites count:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
