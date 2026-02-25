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
    let { episodeSlug, progress, duration, completed } = body;

    if (!episodeSlug || typeof episodeSlug !== 'string') {
      return new Response(JSON.stringify({ error: 'episodeSlug is required' }), {
        status: 400,
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
    let previousProgress = 0;
    let previousDuration  = 0;
    let wasAlreadyCompleted = false;

    if (existingIdx !== -1) {
      previousProgress     = user.playbackHistory[existingIdx].progress  ?? 0;
      previousDuration     = user.playbackHistory[existingIdx].duration  ?? 0;
      wasAlreadyCompleted  = user.playbackHistory[existingIdx].completed ?? false;
      user.playbackHistory.splice(existingIdx, 1); // Remove (we'll re-add at top)
    }

    // ── Determine final duration ──────────────────────────────────────────────
    const finalDuration = duration > 0 ? duration : (previousDuration > 0 ? previousDuration : 0);

    // ── Determine if completed ────────────────────────────────────────────────
    // Three conditions mark an episode as complete:
    //   1. The client explicitly sends completed=true (onended)
    //   2. Progress ≥ 90% of the known duration
    //   3. It was already marked completed before (never regress a completed episode)
    const completedByThreshold =
      finalDuration > 0 && progress >= finalDuration * 0.90;

    const isNowCompleted = completed || completedByThreshold || wasAlreadyCompleted;

    // ── Accumulate listeningTime delta ────────────────────────────────────────
    // Only add the *new* seconds listened (progress - previousProgress).
    // This prevents double-counting when the same progress is re-sent.
    // Cap at 5 min per update to prevent abuse or seek-to-end tricks.
    const MAX_DELTA_SECONDS = 300;
    const delta = Math.min(Math.max(progress - previousProgress, 0), MAX_DELTA_SECONDS);

    // ── Persist completed episode slug permanently ────────────────────────────
    // completedEpisodes is a permanent Set-like array, never truncated.
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

    // ── Atomically increment listeningTime if delta > 0 ─────────────────────
    // Using $inc via findByIdAndUpdate after the history save to avoid race conditions.
    await user.save();

    if (delta > 0) {
      await User.findByIdAndUpdate(userPayload.userId, {
        $inc: { listeningTime: delta }
      });
    }

    // ── Check for Guest Card Unlocks ──────────────────────────────────────────
    // If the episode was just newly marked as completed, try to unlock guest cards.
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
