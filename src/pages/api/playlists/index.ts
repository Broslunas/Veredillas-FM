import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '@/lib/auth';
import User from '@/models/User';

export const prerender = false;

// Obtener las listas de reproducción del usuario
export const GET: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    const user = await User.findById(userPayload.userId).select('playlists');
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ playlists: user.playlists || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};

// Crear una nueva lista de reproducción
export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    const body = await request.json();
    const { name, isPublic = false } = body;

    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid name' }), { status: 400 });
    }

    const newPlaylist = {
      _id: new mongoose.Types.ObjectId(),
      name,
      isPublic,
      episodes: [],
      createdAt: new Date()
    };

    const user = await User.findByIdAndUpdate(
      userPayload.userId,
      { $push: { playlists: newPlaylist } },
      { new: true }
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, playlist: newPlaylist }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
