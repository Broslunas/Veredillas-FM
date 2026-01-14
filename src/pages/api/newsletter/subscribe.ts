import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email } = data;

    if (!name || !email) {
      return new Response(
        JSON.stringify({ message: "Nombre y email son requeridos." }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine the origin to send to n8n, so it can construct the confirmation link correctly
    const origin = request.headers.get('origin') || import.meta.env.SITE || 'https://veredillasfm.es';
    
    // N8N Webhook URL
    const webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-newsletter-send-email";

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": origin
      },
      body: JSON.stringify({ 
        name, 
        email
      })
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ message: "Suscripción iniciada correctamente" }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      const errorText = await response.text();
      console.error("Newsletter webhook error:", response.status, errorText);
      return new Response(
        JSON.stringify({ message: `Error del servidor de suscripción (${response.status}): ${errorText || 'Sin detalles'}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Newsletter API error:", error);
    return new Response(
      JSON.stringify({ message: "Error interno del servidor." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
