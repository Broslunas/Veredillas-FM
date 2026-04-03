import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import GuestSubscription from '../../../models/GuestSubscription';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    const subscription = await request.json();

    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ error: 'Suscripción inválida' }), { status: 400 });
    }

    await dbConnect();

    if (userPayload) {
      const user = await User.findById(userPayload.userId);
      if (user) {
        // Asegurarse de que no duplicamos la suscripción
        const hasSub = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
        
        if (!hasSub) {
          user.pushSubscriptions.push(subscription);
          await user.save();
        }
        return new Response(JSON.stringify({ success: true, type: 'user' }), { status: 200 });
      }
    }

    // Guest subscription fallback
    const existingSub = await GuestSubscription.findOne({ endpoint: subscription.endpoint });
    if (!existingSub) {
      await GuestSubscription.create(subscription);
    }

    return new Response(JSON.stringify({ success: true, type: 'guest' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
  }
};
