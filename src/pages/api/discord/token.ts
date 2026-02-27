import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code } = await request.json();

    if (!code) {
      return new Response(JSON.stringify({ error: 'Code is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clientId = import.meta.env.PUBLIC_DISCORD_CLIENT_ID;
    const clientSecret = import.meta.env.DISCORD_CLIENT_SECRET || process.env.DISCORD_CLIENT_SECRET; // Soporta ambos entornos

    if (!clientId || !clientSecret || clientSecret === "your_discord_client_secret_here") {
      console.error("Faltan variables de entorno: ", { clientId: !!clientId, clientSecret: !!clientSecret });
      return new Response(JSON.stringify({ error: 'Faltan credenciales de Discord en el servidor o no se ha configurado el secret real.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
      }),
    });

    if (!response.ok) {
        const errData = await response.text();
        return new Response(JSON.stringify({ error: 'Failed to exchange code', details: errData }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error exchanging Discord token:", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
