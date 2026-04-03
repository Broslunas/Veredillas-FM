import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import InterviewRequest from '../../../models/InterviewRequest';
import User from '../../../models/User';
import { getUserFromCookie } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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
    const { id } = data;

    if (!id) {
        return new Response(JSON.stringify({ message: "Falta el ID de la solicitud" }), { status: 400 });
    }

    // 3. Delete
    const deletedRequest = await InterviewRequest.findByIdAndDelete(id);

    if (!deletedRequest) {
        return new Response(JSON.stringify({ message: "Solicitud no encontrada" }), { status: 404 });
    }

    // Trigger Webhook
    const webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-interview-response";
    const secret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    if (secret) {
        try {
            fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${secret}`
                },
                body: JSON.stringify({
                    ...deletedRequest.toObject(),
                    action: 'deleted',
                    timestamp: new Date().toISOString()
                })
            }).catch(err => console.error("Webhook error:", err));
        } catch (e) {
            console.error("Webhook triggering failed", e);
        }
    }

    return new Response(
      JSON.stringify({ message: "Solicitud eliminada correctamente" }),
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
