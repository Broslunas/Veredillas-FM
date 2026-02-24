// GET /api/achievements — Returns all achievements with unlock status for the current user
import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import mongoose from 'mongoose';
import User from '../../../models/User';
import UserAchievement from '../../../models/UserAchievement';
import Comment from '../../../models/Comment';
import {
  ACHIEVEMENTS,
  computeUnlockedAchievements,
  type AchievementStats,
  RARITY_COLORS,
  RARITY_LABELS,
  CATEGORY_LABELS,
} from '../../../lib/achievements';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
      await mongoose.connect(MONGODB_URI);
    }

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Gather stats
    const now = new Date();
    const daysSinceJoin = Math.floor(
      (now.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const episodesThisWeek = (user.playbackHistory || []).filter(
      (h: { listenedAt: Date }) => new Date(h.listenedAt) >= oneWeekAgo
    ).length;

    const completedEpisodes = (user.playbackHistory || []).filter(
      (h: { completed: boolean }) => h.completed
    ).length;

    const commentCount = await Comment.countDocuments({ email: user.email });

    // Determine peaked listening hour from most recent listen event timestamp
    const recentListens = (user.playbackHistory || []).slice(-10);
    const hours = recentListens.map((h: { listenedAt: Date }) => new Date(h.listenedAt).getHours());
    const peakHour = hours.length > 0 
      ? hours.reduce((acc: number, h: number) => acc + h, 0) / hours.length 
      : 12;

    const stats: AchievementStats = {
      listeningTime: user.listeningTime || 0,
      favoritesCount: (user.favorites || []).length,
      playbackHistoryCount: (user.playbackHistory || []).length,
      completedEpisodesCount: completedEpisodes,
      consecutiveEpisodes: 0, // Tracked via frontend / session
      commentsCount: commentCount,
      likedClipsCount: (user.likedClips || []).length,
      newsletterSubscribed: user.newsletter !== false,
      daysSinceJoin,
      favoritedSeasonsCount: 0, // Would require content collection
      totalSeasonsCount: 1,
      loginStreakDays: daysSinceJoin >= 1 ? Math.min(daysSinceJoin, 7) : 0,
      hasProfilePicture: !!user.picture,
      hasBio: !!(user.bio && user.bio.trim().length > 0),
      joinedYear: new Date(user.createdAt).getFullYear(),
      peakListeningHour: Math.round(peakHour),
      episodesListenedThisWeek: episodesThisWeek,
      chatMessagesCount: 0,
    };

    // Compute which achievements should be unlocked by stats
    const qualifiedIds = new Set(computeUnlockedAchievements(stats));

    // Fetch already stored unlocks from DB
    const storedUnlocks = await UserAchievement.find({ userId: user._id });
    const storedIds = new Set(storedUnlocks.map(u => u.achievementId));
    const unlockedAtMap = new Map(storedUnlocks.map(u => [u.achievementId, u.unlockedAt]));

    // Determine new unlocks to persist
    const newlyUnlocked: string[] = [];
    for (const id of qualifiedIds) {
      if (!storedIds.has(id)) {
        newlyUnlocked.push(id);
      }
    }

    if (newlyUnlocked.length > 0) {
      await UserAchievement.insertMany(
        newlyUnlocked.map(achievementId => ({
          userId: user._id,
          achievementId,
          unlockedAt: new Date(),
        })),
        { ordered: false }
      ).catch(() => {}); // ignore duplicate key errors
    }

    // All unlock ids (stored + just-added)
    const allUnlockedIds = new Set([...storedIds, ...newlyUnlocked]);

    // Build response payload
    const totalPoints = ACHIEVEMENTS.reduce((sum, a) => {
      if (allUnlockedIds.has(a.id)) return sum + a.points;
      return sum;
    }, 0);

    const achievementsPayload = ACHIEVEMENTS.map(a => {
      const unlocked = allUnlockedIds.has(a.id);
      const isNew = newlyUnlocked.includes(a.id);

      // Compute progress if the achievement supports it
      let progressCurrent: number | null = null;
      let progressMax: number | null = null;
      let progressPct: number | null = null;
      let progressUnit: string | null = null;

      if (a.progress && (!a.secret || unlocked)) {
        try {
          const p = a.progress(stats);
          progressCurrent = p.current;
          progressMax     = p.max;
          progressPct     = Math.min(100, Math.round((p.current / p.max) * 100));
          progressUnit    = p.unit;
        } catch {}
      }

      return {
        id: a.id,
        name: unlocked || !a.secret ? a.name : '???',
        description: unlocked || !a.secret ? a.description : 'Logro secreto — ¡descúbrelo!',
        icon: unlocked || !a.secret ? a.icon : '🔒',
        rarity: a.rarity,
        rarityLabel: RARITY_LABELS[a.rarity],
        rarityColor: RARITY_COLORS[a.rarity],
        category: a.category,
        categoryLabel: CATEGORY_LABELS[a.category],
        points: a.points,
        unlocked,
        isNew,
        unlockedAt: unlockedAtMap.get(a.id) ?? null,
        secret: a.secret ?? false,
        progressCurrent,
        progressMax,
        progressPct,
        progressUnit,
      };
    });

    return new Response(
      JSON.stringify({
        achievements: achievementsPayload,
        totalPoints,
        totalUnlocked: allUnlockedIds.size,
        totalAchievements: ACHIEVEMENTS.length,
        newlyUnlocked,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[achievements GET]', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
