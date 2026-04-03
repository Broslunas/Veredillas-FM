import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

// Agregar o quitar un episodio de una lista de reproducción
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

    const { playlistId, episodeSlug } = await request.json();

    if (!playlistId || !episodeSlug) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const playlist = user.playlists?.find((p: any) => p._id.toString() === playlistId);
    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { status: 404 });
    }

    let isAdded = false;
    if (playlist.episodes.includes(episodeSlug)) {
      // Remove it
      playlist.episodes = playlist.episodes.filter((slug: string) => slug !== episodeSlug);
    } else {
      // Add it
      playlist.episodes.push(episodeSlug);
      isAdded = true;
    }

    await user.save();

    return new Response(JSON.stringify({ 
      success: true, 
      isAdded,
      playlist 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error toggling episode in playlist:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
