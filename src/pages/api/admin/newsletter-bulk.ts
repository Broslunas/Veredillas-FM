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
      console.warn('[Admin] Unauthorized attempt to trigger bulk newsletter');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    
    // Detailed role check with logging
    if (!currentUser) {
      console.error(`[Admin] Authenticated user not found in DB: ${userPayload.userId}`);
      return new Response(JSON.stringify({ error: 'User not found' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
      console.warn(`[Admin] Access denied for user ${currentUser.name} (${currentUser.role})`);
      return new Response(JSON.stringify({ 
        error: 'Forbidden: Admin or Owner role required',
        currentRole: currentUser.role
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
