import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import { getUserFromCookie } from '@/lib/auth';
import User from '@/models/User';
import { sendEmail } from '@/lib/mailjet';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { userId, reason } = await request.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const siteUrl = "https://www.veredillasfm.es";
    const htmlContent = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
    body { margin:0; padding:0; background:#000000; font-family:'Inter', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
    a { text-decoration:none; }
    @media (max-width:620px){
      .container { width:100%!important; }
      .p-24 { padding:24px!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#000000;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000000;">
    <tr>
      <td align="center" style="padding:24px;">
        <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px; max-width:600px; background:#0a0a0a; border-radius:24px; overflow:hidden; border: 1px solid #2d2d2d; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
          
          <!-- Header with Warning Gradient -->
          <tr style="background: linear-gradient(180deg, #2d1e1e 0%, #0a0a0a 100%);">
            <td align="center" style="padding:40px 32px 24px;">
              <a href="${siteUrl}" target="_blank">
                <img src="${siteUrl}/logo.webp" width="80" height="80" alt="Veredillas FM" style="display:block; border:0; border-radius:18px; box-shadow: 0 10px 30px rgba(225, 29, 72, 0.2);">
              </a>
              <div style="margin:24px 0 0; display:inline-block; background:rgba(245, 158, 11, 0.1); padding:6px 16px; border-radius:24px; border:1px solid #f59e0b;">
                <p style="margin:0; font-size:11px; color:#fbbf24; font-weight:800; text-transform:uppercase; letter-spacing:2px;">⚠️ ADVERTENCIA FORMAL</p>
              </div>
              <h1 style="margin:20px 0 0; font-size:28px; line-height:1.2; color:#ffffff; font-weight: 800; letter-spacing: -1px;">
                Cumplimiento de <span style="color:#f59e0b;">Términos</span>
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 20px; font-size:16px; color:#ffffff; line-height:1.6;">
                Hola <strong>${targetUser.name}</strong>,
              </p>
              <p style="margin:0 0 24px; font-size:15px; color:#a1a1aa; line-height:1.6;">
                Te escribimos desde el equipo de administración de <strong>Veredillas FM</strong> porque hemos detectado una posible infracción en el uso de tu cuenta relacionada con nuestro sistema de ranking y gamificación.
              </p>

              <!-- Warning Box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1a110a; border-left:4px solid #f59e0b; border-radius:8px; margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px; font-size:12px; font-weight:800; color:#f59e0b; text-transform:uppercase; letter-spacing:1px;">INCIDENCIA DETECTADA</p>
                    <p style="margin:0; font-size:15px; color:#fbbf24; line-height:1.5; font-weight:500;">
                      Manipulación artificial del tiempo de escucha (reproducciones en bucle, en segundo plano o en silencio para subir en el ranking).
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px; font-size:15px; color:#a1a1aa; line-height:1.6;">
                Según la <strong>Sección 4</strong> de nuestros <a href="${siteUrl}/terminos-y-condiciones" style="color:#f59e0b; text-decoration:underline;">Términos y Condiciones</a>, el uso de métodos automatizados o la reproducción artificial para manipular las estadísticas no está permitido.
              </p>

              <div style="background:#121212; border:1px solid #2d2d2d; border-radius:16px; padding:24px; margin-bottom:32px;">
                <p style="margin:0 0 16px; font-size:14px; font-weight:700; color:#ffffff; text-transform:uppercase;">Posibles Sanciones:</p>
                <ul style="margin:0; padding:0 0 0 20px; color:#a1a1aa; font-size:14px; line-height:2;">
                  <li>Anulación del tiempo de escucha acumulado.</li>
                  <li>Reinicio total de nivel, racha y medallas.</li>
                  <li>Suspensión permanente del acceso a la plataforma.</li>
                </ul>
              </div>

              <p style="margin:0 0 32px; font-size:15px; color:#a1a1aa; line-height:1.6;">
                Queremos que la competencia por ser el oyente top sea justa y divertida para toda la comunidad. Te pedimos que ceses este comportamiento inmediatamente para evitar sanciones.
              </p>

              <a href="${siteUrl}/perfil" style="display:block; text-align:center; background:#f59e0b; color:#000000; padding:18px 32px; border-radius:12px; font-weight:800; font-size:16px; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);">
                Ir a mi Perfil
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr style="background:#050505; border-top:1px solid #2d2d2d;">
            <td align="center" style="padding:40px 32px;">
              <p style="margin:0 0 20px; font-size:12px; font-weight:700; color:#52525b; text-transform:uppercase; letter-spacing:1px;">Veredillas FM | La voz del IES Veredillas</p>
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 12px;">
                    <a href="https://www.instagram.com/veredillasfm.es/" target="_blank">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" width="20" height="20" alt="Instagram">
                    </a>
                  </td>
                  <td style="padding:0 12px;">
                    <a href="${siteUrl}" target="_blank">
                      <img src="${siteUrl}/logo.webp" width="20" height="20" alt="Web" style="border-radius:4px;">
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:30px 0 0; font-size: 11px; color: #3f3f46;">
                Recibes este correo porque eres un usuario registrado en veredillasfm.es.<br>
                Este correo es una notificación administrativa oficial y no puede cancelarse.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResult = await sendEmail({
      to: targetUser.email,
      toName: targetUser.name,
      subject: '⚠️ Advertencia Formal: Cumplimiento de Términos - Veredillas FM',
      htmlContent: htmlContent,
      bcc: [{ Email: 'pablo.luna.perez.008@gmail.com', Name: 'Admin Copy' }]
    });

    if (emailResult.success) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
    }

  } catch (error) {
    console.error('Error sending warning email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
