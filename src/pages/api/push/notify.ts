import type { APIRoute } from 'astro';
import webpush from 'web-push';
import { getUserFromCookie } from '../../../lib/auth';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import GuestSubscription from '../../../models/GuestSubscription';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    let isAdmin = false;

    // Check auth header for system integrations (like cron or webhooks)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader === `Bearer ${import.meta.env.NEWSLETTER_CRON_SECRET}`) {
      isAdmin = true;
    } else {
      // Check user session
      const cookieHeader = request.headers.get('cookie');
      const userPayload = getUserFromCookie(cookieHeader);

      if (userPayload) {
        await dbConnect();
        const user = await User.findById(userPayload.userId);
        if (user && (user.role === 'admin' || user.role === 'owner')) {
          isAdmin = true;
        }
      }
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
    }

    const body = await request.json();
    const { title, message, url } = body;

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'Título y mensaje son requeridos' }), { status: 400 });
    }

    webpush.setVapidDetails(
      'mailto:contacto@veredillasfm.es',
      import.meta.env.PUBLIC_VAPID_KEY,
      import.meta.env.PRIVATE_VAPID_KEY
    );

    // dbConnect() is already called if session auth is used, but ensure it's called
    await dbConnect();

    // Obtener usuarios con suscripciones
    const users = await User.find({ 'pushSubscriptions.0': { $exists: true } });
    const guestSubs = await GuestSubscription.find({});

    const notifications = [];
    const payload = JSON.stringify({
      title,
      body: message,
      url: url || '/'
    });

    // Notify registered users
    for (const user of users) {
      for (const sub of user.pushSubscriptions) {
        notifications.push(
          webpush.sendNotification(sub as any, payload).catch(err => {
            console.error('Error enviando push a usuario:', user.email, err);
            // Si el error es 410 (Gone), podríamos querer eliminar la suscripción
            if (err.statusCode === 410 || err.statusCode === 404) {
              return User.updateOne(
                { _id: user._id },
                { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
              );
            }
          })
        );
      }
    }

    // Notify guest users
    for (const sub of guestSubs) {
      notifications.push(
        webpush.sendNotification(sub as any, payload).catch(err => {
          console.error('Error enviando push a guest:', err.statusCode);
          if (err.statusCode === 410 || err.statusCode === 404) {
            return GuestSubscription.deleteOne({ _id: sub._id });
          }
        })
      );
    }

    await Promise.all(notifications);

    return new Response(JSON.stringify({ success: true, count: notifications.length }), { status: 200 });
  } catch (error) {
    console.error('Error enviando notificaciones push:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor' }), { status: 500 });
  }
};
