
import { sendEmail } from '@/lib/mailjet';
import Comment from '@/models/Comment';
import dbConnect from '@/lib/mongodb';

const ADMIN_EMAIL = 'pablo.luna.perez.008@gmail.com';
const SITE_URL = import.meta.env.SITE || 'https://veredillasfm.es';

const baseStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
  body { margin:0; padding:0; background:#000000; font-family:'Inter', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; color: #ffffff; }
  .container { width:600px; max-width:600px; background:#0a0a0a; border-radius:24px; overflow:hidden; border: 1px solid #2d2d2d; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
  .header { background: linear-gradient(180deg, #1e1e2d 0%, #0a0a0a 100%); padding:40px 32px 24px; text-align:center; }
  .tag { display:inline-block; background:rgba(139, 92, 246, 0.2); padding:6px 16px; border-radius:24px; border:1px solid #8b5cf6; margin-bottom: 20px; }
  .tag-text { margin:0; font-size:12px; color:#a78bfa; font-weight:800; text-transform:uppercase; letter-spacing:2px; }
  .title { margin:0; font-size:32px; line-height:1.2; color:#ffffff; font-weight: 800; letter-spacing: -1px; }
  .highlight { color:#8b5cf6; }
  .content { padding:32px; }
  .message-card { background:#121212; border-radius:20px; border:1px solid #333; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
  .author { color: #8b5cf6; font-weight: 700; }
  .text { color: #a1a1aa; line-height: 1.6; font-size: 15px; margin: 12px 0 0; }
  .button { display: inline-block; background: #8b5cf6; color: #ffffff !important; padding: 14px 28px; border-radius: 99px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; transition: transform 0.2s; margin-top: 10px; }
  .footer { border-top:1px solid #2d2d2d; padding-top:40px; text-align:center; margin-top: 20px; }
  .social-text { margin:0 0 20px; font-size:14px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:1px; }
  .copyright { margin:30px 0 10px; font-size: 11px; color: #52525b; letter-spacing: 0.5px; font-weight:700; }
  .disclaimer { margin:10px 0; font-size: 11px; color: #3f3f46; letter-spacing: 0.5px; font-weight:400; }
`;

function getEmailTemplate(tag: string, title: string, contentHtml: string, actionText: string, actionUrl: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${baseStyles}</style>
</head>
<body style="margin:0; padding:0; background:#000000;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000000;">
    <tr>
      <td align="center" style="padding:24px;">
        <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600">
          <tr>
            <td class="header">
              <a href="${SITE_URL}" target="_blank">
                <img src="${SITE_URL}/logo.webp" width="70" height="70" alt="Veredillas FM" style="display:block; border:0; border-radius:14px; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3); margin: 0 auto;">
              </a>
              <div style="margin-top: 24px;">
                <div class="tag"><p class="tag-text">${tag}</p></div>
                <h1 class="title">${title}</h1>
              </div>
            </td>
          </tr>
          <tr>
            <td class="content">
              ${contentHtml}
              <div style="text-align: center; margin-top: 32px;">
                <a href="${actionUrl}" class="button">${actionText}</a>
              </div>
              <div class="footer">
                <p class="social-text">CONÉCTATE CON NOSOTROS</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                  <tr>
                    <td style="padding:0 12px;">
                      <a href="https://www.instagram.com/veredillasfm.es/" target="_blank">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" width="20" height="20" alt="Instagram">
                      </a>
                    </td>
                    <td style="padding:0 12px;">
                      <a href="${SITE_URL}" target="_blank">
                        <img src="${SITE_URL}/logo.webp" width="20" height="20" alt="Web">
                      </a>
                    </td>
                  </tr>
                </table>
                <p class="copyright">© 2026 VEREDILLAS FM | LA VOZ DEL IES VEREDILLAS</p>
                <p class="disclaimer">Has recibido este correo por tu actividad en Veredillas FM.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function notifyNewComment(comment: any) {
  const { name, text, slug, parentId, email: authorEmail } = comment;
  const commentUrl = `${SITE_URL}/ep/${slug}#comment-${comment._id}`;

  if (parentId) {
    try {
      await dbConnect();
      const parentComment = await Comment.findById(parentId);
      if (parentComment && parentComment.email) {
        const title = `¡Alguien ha <span style="color:#8b5cf6;">respondido</span>!`;
        const contentHtml = `
          <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 24px;">Hola <strong>${parentComment.name}</strong>,</p>
          <div class="message-card">
            <span class="author">${name}</span> ha dicho:
            <p class="text">"${text}"</p>
          </div>
          <p style="color: #a1a1aa; font-size: 14px;">Han respondido a tu comentario en el episodio: <span style="color: #ffffff;">${slug}</span></p>
        `;

        await sendEmail({
          to: parentComment.email,
          toName: parentComment.name,
          subject: `Respuesta a tu comentario en Veredillas FM 🎙️`,
          htmlContent: getEmailTemplate('🗨️ NUEVA RESPUESTA', title, contentHtml, 'VER RESPUESTA', commentUrl),
          bcc: [{ Email: ADMIN_EMAIL, Name: 'Pablo Luna' }]
        });
        return;
      }
    } catch (error) {
      console.error('Error sending reply notification:', error);
    }
  }

  // Notificación para Admin (Pablo)
  const title = `Nuevo <span style="color:#8b5cf6;">comentario</span> recibido`;
  const contentHtml = `
    <p style="color: #a1a1aa; font-size: 16px; margin-bottom: 24px;">Se ha publicado un nuevo comentario en <strong>${slug}</strong>.</p>
    <div class="message-card">
      <span class="author">${name}</span> (${authorEmail})
      <p class="text">${text}</p>
    </div>
  `;

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      toName: 'Pablo Luna',
      subject: `Nuevo comentario en Veredillas FM: ${slug} 🎙️`,
      htmlContent: getEmailTemplate('📝 NUEVO COMENTARIO', title, contentHtml, 'MODERAR / VER', commentUrl)
    });
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}
