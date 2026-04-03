// POST /api/cards/unlock — Check if an episode's guests should unlock cards for a user
// Called automatically when an episode is marked as completed (≥80% listened)
import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import { getCollection } from 'astro:content';
import mongoose from 'mongoose';
import UnlockedCard from '../../../models/UnlockedCard';
import User from '../../../models/User';
import { checkAndUnlockCards } from '../../../lib/cards';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { episodeSlug } = body;

    if (!episodeSlug) {
      return new Response(JSON.stringify({ error: 'episodeSlug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Connect to DB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
      await mongoose.connect(MONGODB_URI);
    }

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Find episode participants in the content collection
    const episodes = await getCollection('episodios');
    const episode = episodes.find((ep) => ep.slug === episodeSlug);

    if (!episode) {
      return new Response(
        JSON.stringify({ error: 'Episode not found', newlyUnlocked: [] }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const participants: string[] = episode.data.participants ?? [];
    if (participants.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No participants in this episode', newlyUnlocked: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newlyUnlockedNames = await checkAndUnlockCards(user._id, episodeSlug);

    const newlyUnlocked = newlyUnlockedNames.map((name: string) => ({
      guestName: name
    }));

    return new Response(
      JSON.stringify({
        message: newlyUnlocked.length > 0 ? `Unlocked ${newlyUnlocked.length} card(s)!` : 'No new cards unlocked',
        newlyUnlocked,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[cards/unlock POST]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
