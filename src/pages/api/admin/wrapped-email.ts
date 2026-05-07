import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import { getUserFromCookie } from '@/lib/auth';
import User from '@/models/User';
import WrappedSettings from '@/models/WrappedSettings';
import { sendEmail } from '@/lib/mailjet';

export const prerender = false;

const siteUrl = "https://www.veredillasfm.es";

function getWrappedEmailHtml(userName: string, academicLabel: string) {
  const firstName = userName.split(' ')[0];
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    body { margin:0; padding:0; background:#000000; font-family:'Inter', Arial, Helvetica, sans-serif; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
    a { text-decoration:none; }
    @media (max-width:620px){
      .container { width:100%!important; padding:12px!important; }
      .hero-pad { padding:40px 20px 32px!important; }
      .body-pad { padding:32px 20px!important; }
      .footer-pad { padding:32px 20px!important; }
      .stat-cell { padding:16px 6px!important; }
      .cta-btn { padding:16px 24px!important; font-size:15px!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#000000;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000000;">
    <tr>
      <td align="center" class="container" style="padding:24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px; max-width:600px; background:#09090b; border-radius:28px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); box-shadow: 0 40px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05);">

          <!-- ═══════════ HERO HEADER ═══════════ -->
          <tr>
            <td align="center" style="padding:0; background-color:#7c3aed; background-image: linear-gradient(160deg, #4c1d95 0%, #7c3aed 25%, #c026d3 50%, #ec4899 75%, #f97316 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" class="hero-pad" style="padding:56px 40px 48px;">
                    <!-- Logo -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="${siteUrl}" target="_blank">
                            <img src="${siteUrl}/logo.webp" width="88" height="88" alt="Veredillas FM" style="display:block; border:0; border-radius:22px; box-shadow: 0 16px 48px rgba(0,0,0,0.5);">
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Badge -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
                      <tr>
                        <td align="center" style="background-color:#00000033; padding:8px 24px; border-radius:50px; border:1px solid #ffffff33;">
                          <p style="margin:0; font-size:12px; color:#ffffff; font-weight:900; text-transform:uppercase; letter-spacing:4px;">WRAPPED ${academicLabel}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="margin:24px 0 0; font-size:36px; line-height:1.15; color:#ffffff; font-weight:900; letter-spacing:-1.5px; text-align:center;">
                      ${firstName}, tu resumen<br>del curso está listo
                    </h1>
                    <p style="margin:16px 0 0; font-size:15px; color:#ffffffb3; font-weight:500; line-height:1.5; text-align:center;">
                      14 slides con tus estadísticas exclusivas te esperan
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════ BODY CONTENT ═══════════ -->
          <tr>
            <td class="body-pad" style="padding:40px 36px;">

              <!-- Greeting -->
              <p style="margin:0 0 24px; font-size:16px; color:#ffffff; line-height:1.7; font-weight:600;">
                ¡Hola ${firstName}! 👋
              </p>
              <p style="margin:0 0 28px; font-size:15px; color:#a1a1aa; line-height:1.8;">
                Ha llegado el momento. Tu <strong style="color:#c084fc;">Veredillas Wrapped ${academicLabel}</strong> ya está disponible — un viaje interactivo por todo lo que has escuchado, tus logros y tus hábitos de escucha de este curso.
              </p>

              <!-- ── Stat Cards ── -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td width="32%" align="center" style="padding:20px 8px; background-color:#1e1b4b; border-radius:12px;">
                    <p style="margin:0; font-size:28px; line-height:1;">&#x23F1;&#xFE0F;</p>
                    <p style="margin:8px 0 2px; font-size:20px; font-weight:900; color:#ffffff;">???</p>
                    <p style="margin:0; font-size:10px; color:#818cf8; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">Minutos</p>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" align="center" style="padding:20px 8px; background-color:#1a2e05; border-radius:12px;">
                    <p style="margin:0; font-size:28px; line-height:1;">&#x1F3C6;</p>
                    <p style="margin:8px 0 2px; font-size:20px; font-weight:900; color:#ffffff;">???</p>
                    <p style="margin:0; font-size:10px; color:#86efac; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">Logros</p>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" align="center" style="padding:20px 8px; background-color:#451a03; border-radius:12px;">
                    <p style="margin:0; font-size:28px; line-height:1;">&#x1F525;</p>
                    <p style="margin:8px 0 2px; font-size:20px; font-weight:900; color:#ffffff;">???</p>
                    <p style="margin:0; font-size:10px; color:#fbbf24; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">Racha</p>
                  </td>
                </tr>
              </table>

              <!-- Teaser list -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:32px; background-color:#111113; border:1px solid #1e1e24; border-radius:16px; overflow:hidden;">
                <tr>
                  <td style="padding:18px 24px; border-bottom:1px solid #1e1e24;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" style="font-size:18px; vertical-align:middle; padding-right:12px;">&#x1F3A7;</td>
                        <td style="font-size:14px; color:#d4d4d8; font-weight:600; vertical-align:middle;">Tu tiempo de escucha y percentil global</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px; border-bottom:1px solid #1e1e24;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" style="font-size:18px; vertical-align:middle; padding-right:12px;">&#x2B50;</td>
                        <td style="font-size:14px; color:#d4d4d8; font-weight:600; vertical-align:middle;">Tus episodios favoritos y tu podio personal</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px; border-bottom:1px solid #1e1e24;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" style="font-size:18px; vertical-align:middle; padding-right:12px;">&#x1F9E0;</td>
                        <td style="font-size:14px; color:#d4d4d8; font-weight:600; vertical-align:middle;">Resultados de quizzes y perfil de oyente</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="36" style="font-size:18px; vertical-align:middle; padding-right:12px;">&#x1F0CF;</td>
                        <td style="font-size:14px; color:#d4d4d8; font-weight:600; vertical-align:middle;">Cromos, logros y tarjeta descargable</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px; font-size:14px; color:#71717a; line-height:1.7; text-align:center;">
                Comparte tu tarjeta personalizada con tus amigos
              </p>

              <!-- ── CTA Button ── -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${siteUrl}/wrapped" style="height:56px;v-text-anchor:middle;width:300px;" arcsize="28%" fillcolor="#8b5cf6">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">Descubrir mi Wrapped</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${siteUrl}/wrapped" class="cta-btn" style="display:inline-block; text-align:center; background-color:#8b5cf6; background-image:linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color:#ffffff; padding:20px 48px; border-radius:16px; font-weight:900; font-size:17px; letter-spacing:0.3px; border:none; mso-hide:all;">
                      &#x1F381; Descubrir mi Wrapped
                    </a>
                    <!--<![endif]-->
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Subtle note -->
              <p style="margin:28px 0 0; font-size:12px; color:#52525b; line-height:1.6; text-align:center;">
                La experiencia incluye música de fondo y es mejor con auriculares 🎶
              </p>
            </td>
          </tr>

          <!-- ═══════════ FOOTER ═══════════ -->
          <tr>
            <td style="background:#050506; border-top:1px solid #1a1a1f;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" class="footer-pad" style="padding:36px 32px;">
                    <p style="margin:0 0 16px; font-size:11px; font-weight:800; color:#3f3f46; text-transform:uppercase; letter-spacing:2px;">Veredillas FM · La voz del IES Las Veredillas</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                      <tr>
                        <td style="padding:0 10px;">
                          <a href="https://www.instagram.com/veredillasfm.es/" target="_blank">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" width="22" height="22" alt="Instagram" style="display:block; border:0; opacity:0.5;">
                          </a>
                        </td>
                        <td style="padding:0 10px;">
                          <a href="${siteUrl}" target="_blank">
                            <img src="${siteUrl}/logo.webp" width="22" height="22" alt="Web" style="display:block; border:0; border-radius:4px; opacity:0.5;">
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0; font-size:11px; color:#27272a; line-height:1.6;">
                      Recibes este correo porque eres usuario de veredillasfm.es<br>
                      © ${new Date().getFullYear()} Veredillas FM
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// POST /api/admin/wrapped-email
export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    if (!userPayload) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const { action } = await request.json();
    const settings = await WrappedSettings.findOne();
    const year = settings?.year || new Date().getFullYear();
    const academicLabel = `${year}/${year + 1}`;

    if (action === 'test') {
      // Send test email to the admin only
      const html = getWrappedEmailHtml(currentUser.name, academicLabel);
      const result = await sendEmail({
        to: currentUser.email,
        toName: currentUser.name,
        subject: `✨ [TEST] Tu Veredillas Wrapped ${academicLabel} está listo`,
        htmlContent: html,
      });

      if (result.success) {
        return new Response(JSON.stringify({ success: true, message: `Email de prueba enviado a ${currentUser.email}` }), { status: 200 });
      } else {
        return new Response(JSON.stringify({ error: 'Error enviando email de prueba' }), { status: 500 });
      }
    }

    if (action === 'send-all') {
      // Get all users with email
      const allUsers = await User.find({ email: { $exists: true, $ne: '' } }).select('name email');
      let sent = 0;
      let errors = 0;

      for (const u of allUsers) {
        try {
          const html = getWrappedEmailHtml(u.name, academicLabel);
          const result = await sendEmail({
            to: u.email,
            toName: u.name,
            subject: `✨ Tu Veredillas Wrapped ${academicLabel} está listo`,
            htmlContent: html,
          });
          if (result.success) sent++;
          else errors++;
        } catch {
          errors++;
        }
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Enviados: ${sent} | Errores: ${errors} | Total: ${allUsers.length}`
      }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    console.error('Error in wrapped email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
