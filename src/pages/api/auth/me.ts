import type { APIRoute } from 'astro';

import { getUserFromCookie, syncSpotifyEpisodes } from '../../../lib/auth';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import crypto from 'crypto';
import { calculateStreakUpdate } from '../../../lib/streak';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Obtener usuario del token
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conectar a MongoDB
    await dbConnect();

    // Buscar usuario completo en la base de datos
    const user = await User.findById(userPayload.userId).select('-__v');

    if (!user) {
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine picture URL: DB > Gravatar > Placeholder (handled by UI)
    let pictureUrl = user.picture;
    
    if (!pictureUrl && user.email) {
      const hash = crypto
        .createHash('md5')
        .update(user.email.trim().toLowerCase())
        .digest('hex');
      pictureUrl = `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
    }

    // --- STREAK LOGIC ---
    const { currentStreak, maxStreak, lastActiveAt, updated, wasIncremented } = calculateStreakUpdate(
      user.lastActiveAt,
      user.currentStreak,
      user.maxStreak
    );

    if (updated) {
      user.currentStreak = currentStreak;
      user.maxStreak = maxStreak;
      user.lastActiveAt = lastActiveAt;
      await user.save();
    }

    // [NUEVO] Sincronizar episodios de Spotify en segundo plano si es usuario de Spotify
    if (user.spotifyId) {
      try {
        // No bloqueamos excesivamente la respuesta del perfil, pero intentamos sincronizar
        // syncSpotifyEpisodes ya tiene su propio rate-limit interno de 15 min
        await syncSpotifyEpisodes(user._id.toString());
      } catch (syncError) {
        console.error('Error in background Spotify sync:', syncError);
      }
    }

    return new Response(JSON.stringify({ 
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: pictureUrl,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        lastActiveAt: user.lastActiveAt
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting current user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
