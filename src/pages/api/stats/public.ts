import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import dbConnect from '../../../lib/mongodb';
import ListenEvent from '../../../models/ListenEvent';
import User from '../../../models/User';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    await dbConnect();

    const allEpisodes = await getCollection('episodios');
    const now = new Date();
    const publishedEpisodes = allEpisodes.filter(ep => ep.data.pubDate <= now);

    // --- Top episodes by listen count (all time) ---
    const topEpisodesRaw = await ListenEvent.aggregate([
      { $group: { _id: '$episodeSlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const episodeMap = new Map(allEpisodes.map(e => [e.slug, e]));

    const topEpisodes = topEpisodesRaw
      .map(item => {
        const ep = episodeMap.get(item._id);
        if (!ep) return null;
        return {
          slug: item._id,
          title: ep.data.title,
          image: ep.data.image,
          duration: ep.data.duration,
          season: ep.data.season,
          episode: ep.data.episode,
          count: item.count,
        };
      })
      .filter(Boolean);

    // --- Tag frequency ---
    const tagCount: Record<string, number> = {};
    for (const ep of publishedEpisodes) {
      for (const tag of ep.data.tags ?? []) {
        tagCount[tag] = (tagCount[tag] ?? 0) + 1;
      }
    }
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // --- Total listen events ---
    const totalListens = await ListenEvent.countDocuments();

    // --- Total registered users ---
    const totalUsers = await User.countDocuments();

    // --- Total listening time (sum of all users) ---
    const listeningAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$listeningTime' } } },
    ]);
    const totalListeningSeconds = listeningAgg[0]?.total ?? 0;

    // --- Episodes by season ---
    const seasonCount: Record<number, number> = {};
    for (const ep of publishedEpisodes) {
      const s = ep.data.season ?? 0;
      seasonCount[s] = (seasonCount[s] ?? 0) + 1;
    }
    const seasons = Object.entries(seasonCount)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([season, count]) => ({ season: Number(season), count }));

    // --- Monthly publish frequency (last 12 months) ---
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyMap: Record<string, number> = {};
    for (const ep of publishedEpisodes) {
      if (ep.data.pubDate >= twelveMonthsAgo) {
        const key = ep.data.pubDate.toISOString().slice(0, 7); // "YYYY-MM"
        monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
      }
    }
    const monthlyEpisodes = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    return new Response(
      JSON.stringify({
        totalEpisodes: publishedEpisodes.length,
        totalListens,
        totalUsers,
        totalListeningSeconds,
        topEpisodes,
        topTags,
        seasons,
        monthlyEpisodes,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
