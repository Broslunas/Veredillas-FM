// GET /api/cards — Returns all guest cards with unlock status for logged-in user
import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import { getCollection } from 'astro:content';
import mongoose from 'mongoose';
import UnlockedCard from '../../../models/UnlockedCard';
import User from '../../../models/User';
import { syncAllUserCards } from '../../../lib/cards';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    // Connect to DB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
      await mongoose.connect(MONGODB_URI);
    }

    // Get all guest cards from content collection
    const guests = await getCollection('guests');

    let unlockedSlugs: string[] = [];
    let unlockedMap: Map<string, { episodeSlug: string; unlockedAt: Date }> = new Map();

    if (userPayload) {
      // ── Sync catch-up logic ──
      // This ensures if episodes were completed before guest cards were set up,
      // the user gets them automatically when they visit the album.
      await syncAllUserCards(userPayload.userId);

      const user = await User.findById(userPayload.userId);
      if (user) {
        const unlocks = await UnlockedCard.find({ userId: user._id });
        for (const unlock of unlocks) {
          unlockedSlugs.push(unlock.guestSlug);
          unlockedMap.set(unlock.guestSlug, {
            episodeSlug: unlock.episodeSlug,
            unlockedAt: unlock.unlockedAt,
          });
        }
      }
    }

    const cards = guests.map((guest) => {
      const slug = guest.slug;
      const unlocked = unlockedSlugs.includes(slug);
      const unlockData = unlockedMap.get(slug);

      return {
        slug,
        name: guest.data.name,
        role: guest.data.role ?? null,
        description: guest.data.description ?? null,
        image: guest.data.image ?? null,
        social: guest.data.social ?? null,
        unlocked,
        episodeSlug: unlockData?.episodeSlug ?? null,
        unlockedAt: unlockData?.unlockedAt ?? null,
      };
    });

    return new Response(
      JSON.stringify({
        cards,
        unlockedCount: unlockedSlugs.length,
        totalCount: guests.length,
        isAuthenticated: !!userPayload,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[cards GET]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
