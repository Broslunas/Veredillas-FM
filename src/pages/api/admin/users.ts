
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // 1. Authenticate User
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Connect to DB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI not configured');
      }
      await mongoose.connect(MONGODB_URI);
    }

    // 3. Verify Admin Role
    const currentUser = await User.findById(userPayload.userId);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Fetch All Users
    const users = await User.find({})
      .select('-__v')
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify({ 
      success: true,
      users: users
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
