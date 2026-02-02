import type { APIRoute } from 'astro';

import { getUserFromCookie } from '../../../lib/auth';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import crypto from 'crypto';

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

    return new Response(JSON.stringify({ 
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: pictureUrl, // Send Gravatar URL if no picture
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
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
