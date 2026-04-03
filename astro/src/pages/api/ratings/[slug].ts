import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await dbConnect();
    
    // Get all verified comments with ratings for this episode
    const comments = await Comment.find({ 
      slug, 
      isVerified: true,
      rating: { $gt: 0 } // Only comments with a rating
    }).select('rating').lean();

    if (comments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        data: {
          average: 0,
          count: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate average
    const totalRating = comments.reduce((sum: number, c: any) => sum + (c.rating || 0), 0);
    const average = totalRating / comments.length;

    // Calculate distribution
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    comments.forEach((c: any) => {
      if (c.rating >= 1 && c.rating <= 5) {
        distribution[c.rating]++;
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        average: Math.round(average * 10) / 10, // Round to 1 decimal
        count: comments.length,
        distribution
      }
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
