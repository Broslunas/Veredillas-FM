import type { APIRoute } from 'astro';
import { sendEmail } from '../../../lib/mailjet';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import dbConnect from '../../../lib/mongodb';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    await dbConnect();
    
    const data = await request.json();
    const { to, title, url, image } = data;

    if (!to || !title || !url) {
      return new Response(
        JSON.stringify({ success: false, message: 'Faltan datos obligatorios.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auth: Identify Sender
    const cookieHeader = request.headers.get('cookie');
    const senderPayload = getUserFromCookie(cookieHeader);
    let senderName = "Alguien";
    if (senderPayload) {
        senderName = senderPayload.name;
    }

    // Check Recipient
    const recipient = await User.findOne({ email: to });
    const recipientName = recipient ? recipient.name : "";
    const isRegistered = !!recipient;

    // Email content construction
    const siteUrl = "https://veredillasfm.es";
    const episodeImage = image || `${siteUrl}/logo.webp`;
    
    // Personalized Greeting
    let greeting = `¡Hola! <span style="color: #8b5cf6; font-weight: 800;">${senderName}</span> cree que te gustaría este episodio de Veredillas FM.`;
    if (isRegistered) {
        greeting = `¡Hola <span style="color: #8b5cf6; font-weight: 800;">${recipientName}</span>! Nos alegra verte de nuevo. <span style="color: #8b5cf6;">${senderName}</span> te recomienda este episodio.`;
    }

    const htmlContent = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .p-20 { padding: 20px !important; }
    }
    .btn:hover { background: #7c3aed !important; transform: scale(1.02); }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Inter', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 30px 10px;">
        <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #0a0a0a; border-radius: 24px; overflow: hidden; border: 1px solid #2d2d2d; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 30px 20px;">
              <a href="${siteUrl}" style="text-decoration: none;">
                <img src="${siteUrl}/logo.webp" width="70" height="70" alt="Veredillas FM" style="border-radius: 16px; border: 1px solid #333; box-shadow: 0 5px 15px rgba(139, 92, 246, 0.3);">
              </a>
              <h1 style="margin: 24px 0 0; font-size: 26px; color: #ffffff; letter-spacing: -1px; font-weight: 800;">${senderName} te ha recomendado un episodio</h1>
            </td>
          </tr>

          <!-- Context Message -->
          <tr>
            <td class="p-20" style="padding: 0 40px 30px; text-align: center;">
              <p style="margin: 0; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>
            </td>
          </tr>

          <!-- Episode Card -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #121212; border-radius: 20px; border: 1px solid #333; overflow: hidden;">
                <tr>
                  <td>
                    <a href="${url}">
                      <img src="${episodeImage}" width="100%" height="auto" alt="${title}" style="display: block; border-bottom: 1px solid #333;">
                    </a>
                    <div style="padding: 30px;">
                      <p style="margin: 0 0 8px; font-size: 11px; color: #8b5cf6; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">⭐ RECOMENDACIÓN ESPECIAL</p>
                      <h2 style="margin: 0 0 16px; font-size: 22px; color: #ffffff; font-weight: 800; line-height: 1.2;">${title}</h2>
                      <div style="margin-top: 25px;">
                        <a href="${url}" class="btn" style="display: inline-block; background: #8b5cf6; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 16px; text-decoration: none; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4); transition: all 0.2s;">
                          Escuchar Episodio 🎙️
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Registration CTA if not registered -->
          ${!isRegistered ? `
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0,0,0,0)); border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 20px; padding: 24px;">
                <tr>
                  <td align="center">
                    <h3 style="margin: 0 0 10px; color: #ffffff; font-size: 18px;">¿Aún no eres parte de la comunidad?</h3>
                    <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 14px; line-height: 1.5;">Únete a Veredillas FM para guardar tus favoritos, ganar logros y seguir tus estadísticas de escucha.</p>
                    <a href="${siteUrl}/login" style="color: #8b5cf6; font-weight: 800; font-size: 14px; text-decoration: none; text-transform: uppercase;">Crear cuenta gratis →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Footer Links (More Options) -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 16px; font-size: 12px; color: #52525b; font-weight: 800; text-transform: uppercase; text-align: center; letter-spacing: 1px;">MÁS CONTENIDO</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/ep" style="color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; margin: 0 10px;">Catálogo</a>
                    <span style="color: #333;">•</span>
                    <a href="${siteUrl}/clips" style="color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; margin: 0 10px;">Clips</a>
                    <span style="color: #333;">•</span>
                    <a href="${siteUrl}/stats" style="color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; margin: 0 10px;">Rankings</a>
                    <span style="color: #333;">•</span>
                    <a href="${siteUrl}/blog" style="color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none; margin: 0 10px;">Noticias</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top: 40px; border-top: 1px solid #2d2d2d; padding-top: 30px; text-align: center;">
                 <p style="margin: 0; color: #52525b; font-size: 11px;">© 2026 Veredillas FM | La voz del IES Veredillas</p>
                 <p style="margin: 10px 0 0; color: #52525b; font-size: 11px;">Si no quieres recibir más correos de recomendaciones, puedes ignorar este mensaje.</p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const subject = isRegistered 
        ? `🎙️ ${senderName} te recomienda este episodio en Veredillas FM`
        : `🎙️ ¡Te han invitado a escuchar Veredillas FM!`;

    const result = await sendEmail({
      to,
      toName: recipientName || "Oyente de Veredillas FM",
      subject: subject,
      htmlContent,
      fromEmail: "hola@veredillasfm.es",
      fromName: "Veredillas FM (Compartir)"
    });

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, message: 'Email enviado correctamente.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Error al enviar el email.', error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[ShareEmailAPI] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Error interno del servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
