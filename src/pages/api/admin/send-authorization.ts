import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import dbConnect from '../../../lib/mongodb';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // 1. Authenticate Admin
  const cookieHeader = request.headers.get('cookie');
  const userPayload = getUserFromCookie(cookieHeader);

  if (!userPayload) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 401 });
  }

  await dbConnect();
  const currentUser = await User.findById(userPayload.userId);
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
    return new Response(JSON.stringify({ message: 'Prohibido' }), { status: 403 });
  }

  // 2. Process Request
  try {
    const data = await request.json();
    const { name, email, docType, docUrl } = data;

    if (!name || !email || !docType || !docUrl) {
      return new Response(
        JSON.stringify({ message: 'Faltan datos (nombre, email, tipo o url)' }),
        { status: 400 }
      );
    }

    const webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-autorizations";
    const secret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    if (!secret) {
        return new Response(
            JSON.stringify({ message: 'Error de configuración del servidor (Secret missing).' }),
            { status: 500 }
        );
    }

    // 3. Send to n8n
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`
      },
      body: JSON.stringify({
        recipientName: name,
        recipientEmail: email,
        authorizationType: docType,
        documentUrl: docUrl,
        adminUser: currentUser.email,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ message: "Autorización enviada correctamente" }),
        { status: 200 }
      );
    } else {
      console.error("Webhook error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ message: "Error al enviar al webhook" }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ message: "Error interno del servidor" }),
      { status: 500 }
    );
  }
}
