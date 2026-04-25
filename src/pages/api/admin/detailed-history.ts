import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import { getUserFromCookie } from '@/lib/auth';
import User from '@/models/User';
import ListenEvent from '@/models/ListenEvent';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const targetUserId = url.searchParams.get('userId');
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    // Get target user to include their standard history (last 100 episodes)
    const targetUser = await User.findById(targetUserId).select('playbackHistory name').lean();
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Get all granular listen events for this user (Audit log)
    const events = await ListenEvent.find({ userId: targetUserId })
      .sort({ timestamp: -1 })
      .lean();

    // Group by episode to count "cuantas veces"
    const grouped = await ListenEvent.aggregate([
      { $match: { userId: targetUserId } },
      { $group: { 
          _id: '$episodeSlug', 
          count: { $sum: 1 }, 
          lastListened: { $max: '$timestamp' } 
      }},
      { $sort: { lastListened: -1 } }
    ]);

    return new Response(JSON.stringify({ 
      events, 
      grouped, 
      playbackHistory: targetUser.playbackHistory || [] 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching detailed history:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
