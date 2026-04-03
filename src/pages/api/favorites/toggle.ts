import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Obtener usuario del token
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
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

    // Obtener slug del episodio
    const body = await request.json();
    const { episodeSlug } = body;

    if (!episodeSlug || typeof episodeSlug !== 'string') {
      return new Response(JSON.stringify({ error: 'Episode slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Buscar usuario
    const user = await User.findById(userPayload.userId);

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Inicializar favorites si no existe (para usuarios existentes)
    const currentFavorites = user.favorites || [];
    
    // Verificar si ya está en favoritos
    const index = currentFavorites.indexOf(episodeSlug);
    let newFavorites: string[];
    let isFavorite: boolean;

    if (index > -1) {
      // Remover de favoritos
      newFavorites = currentFavorites.filter(slug => slug !== episodeSlug);
      isFavorite = false;
    } else {
      // Agregar a favoritos
      newFavorites = [...currentFavorites, episodeSlug];
      isFavorite = true;
    }

    // Usar findByIdAndUpdate para actualización atómica
    const updatedUser = await User.findByIdAndUpdate(
      userPayload.userId,
      { $set: { favorites: newFavorites } },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error('Failed to update user');
    }


    return new Response(JSON.stringify({ 
      success: true,
      isFavorite,
      favoritesCount: newFavorites.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error toggling favorite:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
