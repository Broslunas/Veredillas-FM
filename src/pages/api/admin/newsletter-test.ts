import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import { processTestNewsletter } from '../../../lib/newsletter-test-service';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Authenticate & Authorize
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      console.warn('[Admin] Unauthorized attempt to trigger test newsletter');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    
    // Detailed role check
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

    // 2. Parse Body
    const body = await request.json();
    const { userId, sendToMe } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Process Test Newsletter
    const recipientEmail = sendToMe ? currentUser.email : undefined;
    const result = await processTestNewsletter(userId, recipientEmail);

    if (result.success) {
      return new Response(JSON.stringify({ success: true, message: 'Newsletter de prueba enviada correctamente' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Error al enviar mailjet', details: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error sending test newsletter:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
