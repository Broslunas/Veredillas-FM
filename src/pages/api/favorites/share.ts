import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '../../../models/User';
import { getUserFromCookie } from '../../../lib/auth';

export const prerender = false;

/**
 * Genera un enlace público para compartir favoritos
 */
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

    // Get user
    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate shareable code (use user ID encoded)
    const shareCode = Buffer.from(userPayload.userId).toString('base64url');
    const shareUrl = `${new URL(request.url).origin}/favoritos-publicos/${shareCode}`;

    return new Response(JSON.stringify({
      success: true,
      shareUrl,
      shareCode
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating share link:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
