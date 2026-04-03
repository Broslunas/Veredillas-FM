export const prerender = false;

import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import ActiveListener from '../../../models/ActiveListener';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { sessionId, path, onlyCurrentPath } = await request.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await dbConnect();

    // Identify user from cookie
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    
    let userData = {};
    if (userPayload) {
        // We could fetch the full user to get the picture, or just use what we have
        // To avoid too many DB calls, maybe we can skip fetching picture every time if not strict
        // But for "admin seeing who is listening", picture is nice.
        // Let's try to find the user briefly.
        const user = await User.findById(userPayload.userId).select('name picture');
        if (user) {
            userData = {
                userId: user._id.toString(),
                name: user.name,
                picture: user.picture
            };
        }
    }

    // 1. Update or create the active listener entry
    // We update 'lastSeen' to now
    await ActiveListener.findOneAndUpdate(
      { sessionId },
      { 
        lastSeen: new Date(),
        path: path || '/',
        ...userData
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2. Count active listeners
    // If 'onlyCurrentPath' param is true, limit to this path

    const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes inactivity
    
    let query: any = { lastSeen: { $gt: threshold } };
    if (onlyCurrentPath && path) {
        query.path = path;
    }

    const count = await ActiveListener.countDocuments(query);

    // 3. Optional: Minimum count to avoid "1 listening" loneliness if site is new
    // For now, we return the real count, but ensure at least 1 (the user themselves)
    const displayCount = Math.max(1, count);

    return new Response(JSON.stringify({ count: displayCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Heartbeat Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', count: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
