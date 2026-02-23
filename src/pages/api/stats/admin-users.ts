import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import ListenEvent from '../../../models/ListenEvent';
import Comment from '../../../models/Comment';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const now = new Date();

    // --- 1. Global KPIs ---
    const totalUsers = await User.countDocuments();
    const totalListens = await ListenEvent.countDocuments();

    // Users registered in the last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const newUsersLast30 = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Active users (logged in last 30 days)
    const activeUsersLast30 = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });

    // Total listening time (all users)
    const listeningAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$listeningTime' }, avg: { $avg: '$listeningTime' } } },
    ]);
    const totalListeningSeconds = listeningAgg[0]?.total ?? 0;
    const avgListeningSeconds = listeningAgg[0]?.avg ?? 0;

    // Newsletter subscribers
    const newsletterSubscribers = await User.countDocuments({ newsletter: true });

    // Users with favorites
    const usersWithFavorites = await User.countDocuments({ 'favorites.0': { $exists: true } });

    // --- 2. User Growth (last 12 months) ---
    const twelveMonthsAgo = new Date(now.getTime());
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const userGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const userGrowth = userGrowthRaw.map((g) => ({ month: g._id, count: g.count }));

    // --- 3. Listen Events Timeline (last 30 days) ---
    const listenTimelineRaw = await ListenEvent.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const listenTimeline = listenTimelineRaw.map((l) => ({ date: l._id, count: l.count }));

    // --- 4. Role Distribution ---
    const roleDistRaw = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const roleDistribution = roleDistRaw.map((r) => ({ role: r._id, count: r.count }));

    // --- 5. Top Listeners (by listeningTime) ---
    const topListeners = await User.find({ listeningTime: { $gt: 0 } })
      .sort({ listeningTime: -1 })
      .limit(10)
      .select('name picture listeningTime lastLogin favorites createdAt role')
      .lean();

    // --- 6. Top users by favorites count ---
    const topByFavorites = await User.aggregate([
      { $addFields: { favCount: { $size: { $ifNull: ['$favorites', []] } } } },
      { $match: { favCount: { $gt: 0 } } },
      { $sort: { favCount: -1 } },
      { $limit: 10 },
      { $project: { name: 1, picture: 1, favCount: 1, email: 1 } },
    ]);

    // --- 7. Engagement Score per user (listening time + favorites + history completions) ---
    const engagementRaw = await User.aggregate([
      {
        $addFields: {
          favCount: { $size: { $ifNull: ['$favorites', []] } },
          completedCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$playbackHistory', []] },
                as: 'h',
                cond: { $eq: ['$$h.completed', true] },
              },
            },
          },
          historyCount: { $size: { $ifNull: ['$playbackHistory', []] } },
        },
      },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $multiply: ['$listeningTime', 0.001] }, // 1 point per 1000 seconds
              { $multiply: ['$favCount', 5] }, // 5 points per favorite
              { $multiply: ['$completedCount', 10] }, // 10 points per completed episode
            ],
          },
        },
      },
      { $sort: { engagementScore: -1 } },
      { $limit: 10 },
      { $project: { name: 1, picture: 1, engagementScore: 1, listeningTime: 1, favCount: 1, completedCount: 1, historyCount: 1 } },
    ]);

    // --- 8. Retention: Users by registration age buckets ---
    const retentionBuckets = await User.aggregate([
      {
        $addFields: {
          daysSinceJoin: {
            $divide: [{ $subtract: [now, '$createdAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $bucket: {
          groupBy: '$daysSinceJoin',
          boundaries: [0, 7, 30, 90, 180, 365, 9999],
          default: 'older',
          output: {
            count: { $sum: 1 },
            avListening: { $avg: '$listeningTime' },
          },
        },
      },
    ]);

    // --- 9. Listen events by hour of day (last 30 days) ---
    const hourDistRaw = await ListenEvent.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const hourDistribution = Array.from({ length: 24 }, (_, h) => {
      const found = hourDistRaw.find((r) => r._id === h);
      return { hour: h, count: found?.count ?? 0 };
    });

    // --- 10. Completion rate ---
    const completionAgg = await User.aggregate([
      { $unwind: { path: '$playbackHistory', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$playbackHistory.completed', 1, 0] } },
        },
      },
    ]);
    const totalPlays = completionAgg[0]?.total ?? 0;
    const completedPlays = completionAgg[0]?.completed ?? 0;
    const completionRate = totalPlays > 0 ? Math.round((completedPlays / totalPlays) * 100) : 0;

    // --- 11. Listen events per episode slug (top 5 in last 30 days) ---
    const recentTopEpisodesRaw = await ListenEvent.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$episodeSlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);
    const recentTopEpisodes = recentTopEpisodesRaw.map((e) => ({ slug: e._id, count: e.count }));

    // --- 12. Users with zero listening time ---
    const inactiveUsers = await User.countDocuments({ listeningTime: 0 });

    return new Response(
      JSON.stringify({
        kpis: {
          totalUsers,
          totalListens,
          newUsersLast30,
          activeUsersLast30,
          totalListeningSeconds,
          avgListeningSeconds,
          newsletterSubscribers,
          usersWithFavorites,
          inactiveUsers,
          completionRate,
        },
        userGrowth,
        listenTimeline,
        roleDistribution,
        topListeners,
        topByFavorites,
        engagementRaw,
        retentionBuckets,
        hourDistribution,
        recentTopEpisodes,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=120',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching admin user stats:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
