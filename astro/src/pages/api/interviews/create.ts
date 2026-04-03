import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import InterviewRequest from '../../../models/InterviewRequest';
import { randomUUID } from 'crypto';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, topic, description, preferredDate, source } = data;

    // Validation
    const missingFields = [];
    if (!name) missingFields.push('nombre');
    if (!email) missingFields.push('email');
    if (!topic) missingFields.push('tema');

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ message: `Faltan campos obligatorios: ${missingFields.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Connect to DB
    await dbConnect();

    // Generate Token if Admin Invite
    let inviteToken = undefined;
    if (source === 'admin') {
        inviteToken = randomUUID(); 
    }

    // Create Request
    const newRequest = await InterviewRequest.create({
      name,
      email,
      phone: phone || "undefined",
      topic,
      description,
      preferredDate: preferredDate ? new Date(preferredDate) : undefined,
      status: source === 'admin' ? 'invited' : 'pending',
      token: inviteToken
    });

    // Send to n8n Webhook
    let webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-interview";
    
    // Switch webhook if admin invite
    if (source === 'admin') {
        webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-interview-invite";
    }

    const secret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    if (webhookUrl && secret) {
        try {
            await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${secret}`
                },
                body: JSON.stringify({
                    requestId: newRequest._id,
                    action: "invited",
                    source: source || 'public',
                    token: inviteToken, // Send token to n8n so it can build the URL
                    name,
                    email,
                    topic,
                    description,
                    preferredDate,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (webhookError) {
            console.error("Failed to send to n8n:", webhookError);
        }
    }

    return new Response(
      JSON.stringify({ message: "Solicitud enviada correctamente", id: newRequest._id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ message: "Error interno del servidor." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
