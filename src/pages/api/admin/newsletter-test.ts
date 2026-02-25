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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { userId, sendToMe } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), { status: 500 });
  }
};
