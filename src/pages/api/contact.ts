import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    const { name, email, phone, subject, message } = data;

    // Check specifically which field is missing
    const missingFields = [];
    if (!name) missingFields.push('nombre');
    if (!email) missingFields.push('email');
    if (!subject) missingFields.push('asunto');
    if (!message) missingFields.push('mensaje');

    if (missingFields.length > 0) {
      console.warn("Validation failed. Missing:", missingFields);
      return new Response(
        JSON.stringify({ message: `Faltan campos obligatorios: ${missingFields.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-contact";
    const secret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    if (!secret) {
        console.error("CONTACT_WEBHOOK_SECRET is not defined");
        return new Response(
            JSON.stringify({ message: 'Error de configuración del servidor.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secret}`
      },
      body: JSON.stringify({ 
        name, 
        email, 
        phone: phone || '', 
        subject, 
        message,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ message: "Mensaje enviado correctamente" }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      console.error("Webhook error:", response.status, await response.text());
      return new Response(
        JSON.stringify({ message: "Hubo un problema al enviar tu mensaje. Por favor intenta de nuevo más tarde." }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ message: "Error interno del servidor." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
