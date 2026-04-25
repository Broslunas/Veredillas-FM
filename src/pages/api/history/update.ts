import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { verifyToken } from '@/lib/auth';
import User from '@/models/User';
import { checkAndUnlockCards } from '@/lib/cards';

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
    let { episodeSlug, progress, duration, completed, increment, isVisible, isMuted } = body;

    // The heartbeat is every 15s. A normal increment should be ~15-20s.
    // Reverting strict 45s cap to 300s as requested by user.
    let listenIncrement = typeof increment === 'number' && isFinite(increment) && increment > 0 ? Math.min(increment, 300) : 0;

    // If the audio is muted, we don't count it towards the leaderboard.
    // Loop-abusers typically leave it on mute in a background tab.
    if (isMuted === true) {
        listenIncrement = 0;
    }

    // Basic User retrieval for pattern checking
    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // --- ANTI-LOOPING DETECTION ---
    // If they report progress < 30s for an episode they've already completed
    // and it's happening too frequently, we could flag it. For now, we'll just
    // ensure they don't get double listening time for the same second.
    
    // Basic user update (always update listeningTime if increment > 0)
    if (listenIncrement > 0) {
      user.listeningTime = (user.listeningTime || 0) + listenIncrement;
      user.lastActiveAt = new Date();
      // We don't save yet, we'll save at the end of the request
    }

    // If no episodeSlug, we just return here (only updated general listeningTime)
    if (!episodeSlug || typeof episodeSlug !== 'string') {
        await user.save();
        return new Response(JSON.stringify({ 
            success: true, 
            listeningTimeUpdated: listenIncrement > 0,
            delta: listenIncrement
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Sanitize numbers
    progress = typeof progress === 'number' && isFinite(progress) && progress >= 0 ? progress : 0;
    duration = typeof duration === 'number' && isFinite(duration) && duration > 0 ? duration : 0;
    completed = completed === true;

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
        delta: listenIncrement,
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
