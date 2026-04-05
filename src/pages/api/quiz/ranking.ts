import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '../../../models/User';
import QuizResult from '../../../models/QuizResult';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    let slug = url.searchParams.get('slug');

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Slug is required' }), { status: 400 });
    }

    // Clean and normalize slug for reliable matching
    slug = slug.toLowerCase().split('?')[0].replace(/\/$/, '');

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (MONGODB_URI) await mongoose.connect(MONGODB_URI);
    }

    // Pipeline to get top 10 best results for the episode
    const leaderboard = await QuizResult.aggregate([
      { $match: { episodeSlug: slug } },
      {
        $sort: { score: -1, timeSpent: 1 }
      },
      {
        $group: {
          _id: '$userId',
          bestResult: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$bestResult' }
      },
      { $sort: { score: -1, timeSpent: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          score: 1,
          timeSpent: 1,
          totalQuestions: 1,
          name: { $ifNull: ['$userInfo.name', 'Usuario Anónimo'] },
          picture: '$userInfo.picture',
        }
      }
    ]);

    return new Response(JSON.stringify({ leaderboard }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching quiz ranking:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
