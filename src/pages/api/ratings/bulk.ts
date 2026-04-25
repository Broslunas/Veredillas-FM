import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import Comment from '@/models/Comment';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { slugs } = await request.json();

    if (!Array.isArray(slugs) || slugs.length === 0) {
      return new Response(JSON.stringify({ error: 'Slugs array missing or empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await dbConnect();
    
    // Aggregation to get stats for all requested slugs in one go
    const stats = await Comment.aggregate([
      {
        $match: {
          slug: { $in: slugs },
          isVerified: true,
          rating: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: "$slug",
          average: { $avg: "$rating" },
          count: { $sum: 1 }
          // We could calculate distribution here too if needed, 
          // but for the card mini-view we only need average and count
        }
      }
    ]);

    // Map results for easy lookup
    const results: Record<string, any> = {};
    slugs.forEach(s => {
      results[s] = { average: 0, count: 0 };
    });

    stats.forEach(s => {
      results[s._id] = {
        average: Math.round(s.average * 10) / 10,
        count: s.count
      };
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
