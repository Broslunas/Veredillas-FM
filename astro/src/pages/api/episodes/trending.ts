import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import dbConnect from '../../../lib/mongodb';
import ListenEvent from '../../../models/ListenEvent';

export const GET: APIRoute = async ({ request }) => {
  try {
    await dbConnect();
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'week'; // 'week' or 'month'

    let startDate = new Date();
    if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setDate(startDate.getDate() - 7);
    }

    // Aggregate top listens
    const trending = await ListenEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$episodeSlug',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // If no data, return empty
    if (!trending.length) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // Enrich with episode metadata
    // We need to fetch all episodes to match potentially
    // Optimization: we could just fetch the ones we need if content collection supported filtering by list of slugs easily, 
    // but getCollection loads all info usually anyway, or we utilize the file system.
    // Given the small number of episodes in a podcast (hundreds usually), loading all is fine.
    
    const allEpisodes = await getCollection('episodios');
    const episodeMap = new Map(allEpisodes.map(e => [e.slug, e]));

    const enrichedDocs = trending.map(item => {
      const ep = episodeMap.get(item._id);
      if (!ep) return null;
      
      return {
        slug: item._id,
        count: item.count,
        title: ep.data.title,
        image: ep.data.image,
        author: ep.data.author,
        duration: ep.data.duration,
        pubDate: ep.data.pubDate
      };
    }).filter(Boolean);

    return new Response(JSON.stringify(enrichedDocs), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error('Error fetching trending:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
};
