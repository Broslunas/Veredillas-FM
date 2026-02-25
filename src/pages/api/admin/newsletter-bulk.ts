import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import { processWeeklyNewsletter } from '../../../lib/newsletter-service';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Authenticate & Authorize
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

    // 2. Process the newsletter for all users
    console.log(`[Admin] Bulk newsletter triggered by ${currentUser.name}`);
    const results = await processWeeklyNewsletter();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Proceso de newsletter finalizado',
      results: results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in bulk newsletter:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), { status: 500 });
  }
};
