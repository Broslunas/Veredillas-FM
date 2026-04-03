import type { APIRoute } from 'astro';
import dbConnect from '../../../../lib/mongodb';
import ChatReaction from '../../../../models/ChatReaction';

export const prerender = false

export const POST: APIRoute = async ({ params, request }) => {
  const { slug } = params;
  if (!slug) return new Response('Slug required', { status: 400 });

  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !['heart', 'fire', 'clap', '100'].includes(type)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid reaction type' }), { status: 400 });
    }

    await dbConnect();
    
    // Fire and forget - save to DB
    await ChatReaction.create({
      room: slug,
      type
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, error: 'Failed to post reaction' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
