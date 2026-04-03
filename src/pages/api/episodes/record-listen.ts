import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import ListenEvent from '../../../models/ListenEvent';

export const POST: APIRoute = async ({ request }) => {
  try {
    await dbConnect();
    const data = await request.json();
    const { episodeSlug, userId } = data;

    if (!episodeSlug) {
      return new Response(JSON.stringify({ error: 'Missing episodeSlug' }), { status: 400 });
    }

    // Basic validation to prevent simple spam (could be expanded)
    // For now, trust the client logic (e.g. 60s delay)

    await ListenEvent.create({
      episodeSlug,
      userId: userId || null,
      timestamp: new Date()
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error recording listen:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
