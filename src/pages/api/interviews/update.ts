import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import InterviewRequest from '../../../models/InterviewRequest';
import User from '../../../models/User';
import { getUserFromCookie } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Auth Check
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ message: "No autorizado" }), { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        return new Response(JSON.stringify({ message: "No tienes permisos" }), { status: 403 });
    }

    // 2. Data
    const data = await request.json();
    const { id, status } = data;

    if (!id || !status) {
        return new Response(JSON.stringify({ message: "Faltan datos" }), { status: 400 });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
    if (!validStatuses.includes(status)) {
        return new Response(JSON.stringify({ message: "Estado inválido" }), { status: 400 });
    }

    // 3. Update
    const updatedRequest = await InterviewRequest.findByIdAndUpdate(
        id, 
        { status }, 
        { new: true }
    );

    if (!updatedRequest) {
        return new Response(JSON.stringify({ message: "Solicitud no encontrada" }), { status: 404 });
    }

    // Trigger Webhook
    const webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-interview-response";
    const secret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    if (secret) {
        try {
            // We fire and forget the webhook to not slow down the response
            fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${secret}`
                },
                body: JSON.stringify({
                    ...updatedRequest.toObject(),
                    action: status,
                    timestamp: new Date().toISOString()
                })
            }).catch(err => console.error("Webhook error:", err));
        } catch (e) {
            console.error("Webhook triggering failed", e);
        }
    }

    return new Response(
      JSON.stringify({ message: "Estado actualizado", request: updatedRequest }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ message: "Error interno del servidor." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
