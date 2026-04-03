import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Obtener usuario del token
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conectar a MongoDB
    await dbConnect();

    // Obtener datos del body
    const body = await request.json();
    const { name, bio, newsletter } = body;

    // Validar datos
    if (name && name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'El nombre debe tener al menos 2 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (bio && bio.length > 500) {
      return new Response(JSON.stringify({ error: 'La biografía no puede exceder los 500 caracteres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener usuario actual para comprobar cambios
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser) {
        return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });
    }

    // Actualizar usuario
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    
    // Check if newsletter status actually changed
    let newsletterChanged = false;
    if (newsletter !== undefined) {
        const newStatus = Boolean(newsletter);
        if (currentUser.newsletter !== newStatus) {
            updateData.newsletter = newStatus;
            newsletterChanged = true;
        }
    }

    const user = await User.findByIdAndUpdate(
      userPayload.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Si cambió el estado del newsletter, notificar al webhook
    if (newsletterChanged) {
      const action = Boolean(newsletter) ? 'subscribe' : 'unsubscribe';
      
      try {
        await fetch('https://n8n.broslunas.com/webhook/veredillasfm-unsub-resub', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: user?.name,
            email: user?.email,
            action: action
          }),
        });
      } catch (webhookError) {
        console.error('Error sending newsletter webhook:', webhookError);
        // No fallamos la request si el webhook falla, solo logueamos
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        bio: user.bio,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
