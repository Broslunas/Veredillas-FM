// GET /api/perfil/[id] — Public user profile data
import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '../../../models/User';
import UserAchievement from '../../../models/UserAchievement';
import Comment from '../../../models/Comment';
import { ACHIEVEMENTS, RARITY_COLORS, RARITY_LABELS, CATEGORY_LABELS } from '../../../lib/achievements';
import { getLevel } from '../../../lib/gamification';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: 'ID de usuario inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
      await mongoose.connect(MONGODB_URI);
    }

    const user = await User.findById(id).select(
      'name picture bio favorites likedClips listeningTime completedEpisodes createdAt role'
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch unlocked achievements
    const storedUnlocks = await UserAchievement.find({ userId: user._id });
    const unlockedIds = new Set(storedUnlocks.map((u: { achievementId: string }) => u.achievementId));
    const unlockedAtMap = new Map(storedUnlocks.map((u: { achievementId: string; unlockedAt: Date }) => [u.achievementId, u.unlockedAt]));

    const totalPoints = ACHIEVEMENTS.reduce((sum, a) => unlockedIds.has(a.id) ? sum + a.points : sum, 0);

    // Public achievements payload (no secrets hidden, secrets only shown if unlocked)
    const achievementsPayload = ACHIEVEMENTS
      .filter(a => !a.secret || unlockedIds.has(a.id))
      .map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        rarity: a.rarity,
        rarityLabel: RARITY_LABELS[a.rarity],
        rarityColor: RARITY_COLORS[a.rarity],
        category: a.category,
        categoryLabel: CATEGORY_LABELS[a.category],
        points: a.points,
        unlocked: unlockedIds.has(a.id),
        unlockedAt: unlockedAtMap.get(a.id) ?? null,
      }));

    const level = getLevel(user.listeningTime || 0);

    // Comments count (public info)
    let commentsCount = 0;
    try {
      commentsCount = await Comment.countDocuments({ email: { $exists: true } });
    } catch {}

    return new Response(
      JSON.stringify({
        id: user._id.toString(),
        name: user.name,
        picture: user.picture || null,
        bio: user.bio || null,
        role: user.role,
        createdAt: user.createdAt,
        listeningTime: user.listeningTime || 0,
        favoritesCount: (user.favorites || []).length,
        favorites: user.favorites || [],
        likedClips: user.likedClips || [],
        completedEpisodesCount: (user.completedEpisodes || []).length,
        level: {
          name: level.name,
          icon: level.icon,
          color: level.color,
          description: level.description,
        },
        achievements: achievementsPayload,
        totalPoints,
        totalUnlocked: unlockedIds.size,
        totalAchievements: ACHIEVEMENTS.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  } catch (err) {
    console.error('[perfil GET]', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
};
