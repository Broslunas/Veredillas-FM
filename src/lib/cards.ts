import { getCollection } from 'astro:content';
import mongoose from 'mongoose';
import UnlockedCard from '../models/UnlockedCard';
import User from '../models/User';

/**
 * Normalizes strings for matching (lowercase and trimmed)
 */
function normalize(s: string) {
  return s.toLowerCase().trim();
}

/**
 * Checks and unlocks guest cards for a specific user and episode.
 * Returns an array of newly unlocked guest names.
 */
export async function checkAndUnlockCards(userId: string | mongoose.Types.ObjectId, episodeSlug: string) {
  try {
    // 1. Get episode data to find participants
    const episodes = await getCollection('episodios');
    const episode = episodes.find((ep) => ep.slug === episodeSlug);

    if (!episode || !episode.data.participants || episode.data.participants.length === 0) {
      return [];
    }

    const participants = episode.data.participants;

    // 2. Load all guest cards to match participants to guest slugs
    const guests = await getCollection('guests');

    // 3. Map participants to guest slugs
    const guestMatches: { slug: string; name: string }[] = [];
    for (const participant of participants) {
      const matched = guests.find(
        (g) => normalize(g.data.name) === normalize(participant)
      );
      if (matched) {
        guestMatches.push({ slug: matched.slug, name: matched.data.name });
      }
    }

    if (guestMatches.length === 0) {
      return [];
    }

    // 4. Check which cards are already unlocked
    const existingUnlocks = await UnlockedCard.find({
      userId: userId,
      guestSlug: { $in: guestMatches.map((g) => g.slug) },
    });
    const alreadyUnlockedSlugs = new Set(existingUnlocks.map((u) => u.guestSlug));

    const toUnlock = guestMatches.filter((g) => !alreadyUnlockedSlugs.has(g.slug));

    if (toUnlock.length === 0) {
      return [];
    }

    // 5. Insert newly unlocked cards
    const now = new Date();
    await UnlockedCard.insertMany(
      toUnlock.map((g) => ({
        userId,
        guestSlug: g.slug,
        episodeSlug,
        unlockedAt: now,
      })),
      { ordered: false }
    ).catch(() => {}); // ignore duplicate key errors (redundant safety)

    return toUnlock.map(g => g.name);
  } catch (err) {
    console.error('[checkAndUnlockCards error]', err);
    return [];
  }
}

/**
 * Reconciles a user's collection by checking all their completed episodes.
 * Useful for catching up if guest cards were added after episodes were completed.
 */
export async function syncAllUserCards(userId: string | mongoose.Types.ObjectId) {
  try {
    const user = await User.findById(userId);
    if (!user || !user.completedEpisodes || user.completedEpisodes.length === 0) {
      return 0;
    }

    const episodes = await getCollection('episodios');
    const guests = await getCollection('guests');
    const existingUnlocks = await UnlockedCard.find({ userId });
    const unlockedSlugs = new Set(existingUnlocks.map(u => u.guestSlug));

    let newlyUnlockedCount = 0;
    const cardsToUnlock = [];

    for (const episodeSlug of user.completedEpisodes) {
      const episode = episodes.find(ep => ep.slug === episodeSlug);
      if (!episode || !episode.data.participants) continue;

      for (const participant of episode.data.participants) {
        const matchedGuest = guests.find(g => normalize(g.data.name) === normalize(participant));
        if (matchedGuest && !unlockedSlugs.has(matchedGuest.slug)) {
          // Add to pending unlocks
          cardsToUnlock.push({
            userId,
            guestSlug: matchedGuest.slug,
            episodeSlug,
            unlockedAt: new Date(),
          });
          // Mark as "locally" unlocked to avoid duplicates if same guest in multiple completed episodes
          unlockedSlugs.add(matchedGuest.slug);
          newlyUnlockedCount++;
        }
      }
    }

    if (cardsToUnlock.length > 0) {
      await UnlockedCard.insertMany(cardsToUnlock, { ordered: false }).catch(() => {});
    }

    return newlyUnlockedCount;
  } catch (err) {
    console.error('[syncAllUserCards error]', err);
    return 0;
  }
}

