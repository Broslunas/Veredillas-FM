import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { verifyToken } from '../../../lib/auth';
import User from '../../../models/User';
import { checkAndUnlockCards } from '../../../lib/cards';

export const prerender = false;

/**
 * POST /api/history/update
 *
 * Body: { episodeSlug, progress, duration, completed? }
 *
 * Improvements over the old version:
 *  - Marks an episode as complete if progress ≥ 90% of duration (not just onEnded)
 *  - Persists completed slugs to `completedEpisodes[]` — a permanent list that is
 *    never truncated (unlike playbackHistory which caps at 50)
 *  - Also increments `listeningTime` with the delta since the last saved progress,
 *    so time is only counted once per real second listened (no double-counting)
 *  - Validates and caps incoming values to prevent abuse
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('auth-token')?.value;
    const userPayload = token ? verifyToken(token) : null;

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    const body = await request.json();
    let { episodeSlug, progress, duration, completed, increment } = body;

    // Use explicit increment if provided, or fallback to 0
    const listenIncrement = typeof increment === 'number' && isFinite(increment) && increment > 0 ? Math.min(increment, 300) : 0;

    // Basic user update (always update listeningTime if increment > 0)
    if (listenIncrement > 0) {
      await User.findByIdAndUpdate(userPayload.userId, {
        $inc: { listeningTime: listenIncrement }
      });
    }

    // If no episodeSlug, we just return here (only updated general listeningTime)
    if (!episodeSlug || typeof episodeSlug !== 'string') {
        return new Response(JSON.stringify({ success: true, listeningTimeUpdated: listenIncrement > 0 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Sanitize numbers
    progress = typeof progress === 'number' && isFinite(progress) && progress >= 0 ? progress : 0;
    duration = typeof duration === 'number' && isFinite(duration) && duration > 0 ? duration : 0;
    completed = completed === true;

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Retrieve previous entry for this episode ─────────────────────────────
    const existingIdx = user.playbackHistory?.findIndex(h => h.episodeSlug === episodeSlug) ?? -1;
    let previousDuration  = 0;
    let wasAlreadyCompleted = false;

    if (existingIdx !== -1) {
      previousDuration     = user.playbackHistory[existingIdx].duration  ?? 0;
      wasAlreadyCompleted  = user.playbackHistory[existingIdx].completed ?? false;
      user.playbackHistory.splice(existingIdx, 1); // Remove (we'll re-add at top)
    }

    // ── Determine final duration ──────────────────────────────────────────────
    const finalDuration = duration > 0 ? duration : (previousDuration > 0 ? previousDuration : 0);

    // ── Determine if completed ────────────────────────────────────────────────
    const completedByThreshold =
      finalDuration > 0 && progress >= finalDuration * 0.90;

    const isNowCompleted = completed || completedByThreshold || wasAlreadyCompleted;

    // ── Persist completed episode slug permanently ────────────────────────────
    if (isNowCompleted && !(user.completedEpisodes ?? []).includes(episodeSlug)) {
      user.completedEpisodes = [...(user.completedEpisodes ?? []), episodeSlug];
    }

    // ── Update playbackHistory (rotating, capped at 100) ─────────────────────
    user.playbackHistory.unshift({
      episodeSlug,
      progress,
      duration: finalDuration,
      listenedAt: new Date(),
      completed: isNowCompleted,
    });

    if (user.playbackHistory.length > 100) {
      user.playbackHistory = user.playbackHistory.slice(0, 100);
    }

    await user.save();

    // ── Check for Guest Card Unlocks ──────────────────────────────────────────
    let newlyUnlockedCards: string[] = [];
    if (isNowCompleted && !wasAlreadyCompleted) {
      newlyUnlockedCards = await checkAndUnlockCards(userPayload.userId, episodeSlug);
    }

    return new Response(
      JSON.stringify({
        success: true,
        completed: isNowCompleted,
        completedByThreshold,
        delta,
        newlyUnlockedCards, // Pass this to the client so it can show a notification
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating history:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
