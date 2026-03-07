import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../../../lib/mailjet';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const data = await request.formData();
    const email = data.get('email')?.toString().trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email requerido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // validate email regex lightly
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generar un token temporal válido por 15 minutos
    const magicToken = jwt.sign({ email, type: 'magic_link' }, JWT_SECRET, { expiresIn: '15m' });

    // Construir la URL de verificación
    const verifyUrl = `https://veredillasfm.es/api/auth/email/verify?token=${magicToken}`;

    // Preparar el HTML del correo (Plantilla premium)
    const siteUrl = "https://veredillasfm.es";
    const htmlContent = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Acceso a Veredillas FM</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
    .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; }
    a { text-decoration:none; transition: all 0.2s; }
    body { margin:0; padding:0; background:#000000; font-family:'Inter', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
    @media (max-width:620px){
      .container { width:100%!important; }
      .p-24 { padding:16px!important; }
      .btn { display:block!important; width:100%!important; text-align: center; box-sizing: border-box; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#000000;">
  <div class="preheader">Inicia sesión en Veredillas FM con tu enlace mágico.</div>
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000000;">
    <tr>
      <td align="center" style="padding:24px;">
        <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px; max-width:600px; background:#0a0a0a; border-radius:24px; overflow:hidden; border: 1px solid #2d2d2d; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
          
          <!-- Header with Gradient Background -->
          <tr style="background: linear-gradient(180deg, #1e1e2d 0%, #0a0a0a 100%);">
            <td align="center" style="padding:40px 32px 24px;">
              <a href="${siteUrl}" target="_blank">
                <img src="${siteUrl}/logo.webp" width="90" height="90" alt="Veredillas FM" style="display:block; border:0; border-radius:18px; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);">
              </a>
              <div style="margin:24px 0 0; display:inline-block; background:rgba(139, 92, 246, 0.2); padding:6px 16px; border-radius:24px; border:1px solid #8b5cf6;">
                <p style="margin:0; font-size:12px; color:#a78bfa; font-weight:800; text-transform:uppercase; letter-spacing:2px;">🔑 ENLACE DE ACCESO</p>
              </div>
              <h1 style="margin:20px 0 0; font-size:32px; line-height:1.2; color:#ffffff; font-weight: 800; letter-spacing: -1px;">
                ¡Hola, futuro <span style="color:#8b5cf6;">Oyente</span>!
              </h1>
              <p style="margin:12px 0 0; font-size:15px; color:#a1a1aa; font-weight:400; line-height:1.5;">
                Estás a un paso de continuar con tu experiencia en la plataforma.
              </p>
            </td>
          </tr>

          <!-- Main Action -->
          <tr>
            <td class="p-24" style="padding:32px; text-align:center;">
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#121212; border-radius:20px; border:1px solid #333; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <tr>
                  <td style="padding:40px 32px; text-align:center;">
                    <p style="margin:0 0 32px; font-size:16px; line-height:1.6; color:#a1a1aa;">
                      Haz clic en el siguiente botón para iniciar sesión automáticamente o registrar tu cuenta. El enlace es seguro y expirará en 15 minutos.
                    </p>
                    
                    <a href="${verifyUrl}" class="btn" 
                       style="background:#8b5cf6; color:#ffffff; padding:18px 36px; border-radius:12px; font-weight:700; font-size:16px; display:inline-block; text-align:center; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">
                      Entrar a Veredillas FM ✨
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Socials & Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:40px; border-top:1px solid #2d2d2d; padding-top:40px; text-align:center;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 20px; font-size:14px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:1px;">CONÉCTATE CON NOSOTROS</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td style="padding:0 12px;">
                          <a href="https://www.instagram.com/veredillasfm.es/" target="_blank" style="color:#ffffff;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" width="24" height="24" alt="Instagram">
                          </a>
                        </td>
                        <td style="padding:0 12px;">
                          <a href="https://veredillasfm.es" target="_blank" style="color:#ffffff;">
                            <img src="${siteUrl}/logo.webp" width="24" height="24" alt="Web">
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin:30px 0 10px; font-size: 11px; color: #52525b; letter-spacing: 0.5px; font-weight:700;">© 2026 VEREDILLAS FM | LA VOZ DEL IES VEREDILLAS</p>
                    <p style="margin:10px 0; font-size: 11px; color: #3f3f46; letter-spacing: 0.5px; font-weight:400;">Si no solicitaste este correo, puedes ignorarlo de forma segura.</p>
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

    // Enviar el correo usando Mailjet
    const emailResult = await sendEmail({
      to: email,
      toName: "Oyente",
      fromEmail: "info@veredillasfm.es",
      subject: "Tu acceso a Veredillas FM 🎙️",
      htmlContent
    });

    if (!emailResult.success) {
      throw new Error('Error al enviar el correo');
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Magic link error:', error);
    return new Response(JSON.stringify({ error: 'Error del servidor, inténtalo de nuevo.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
