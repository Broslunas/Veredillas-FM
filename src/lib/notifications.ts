
import { sendEmail } from './mailjet';
import Comment from '../models/Comment';
import dbConnect from './mongodb';

const ADMIN_EMAIL = 'pablo.luna.perez.008@gmail.com';
const SITE_URL = import.meta.env.SITE || 'https://veredillasfm.es';

export async function notifyNewComment(comment: any, isPending: boolean = false) {
  const { name, text, slug, parentId, email: authorEmail } = comment;

  if (parentId && !isPending) {
    try {
      await dbConnect();
      const parentComment = await Comment.findById(parentId);
      if (parentComment && parentComment.email) {
        // Notify original commenter
        await sendEmail({
          to: parentComment.email,
          toName: parentComment.name,
          subject: `Respuesta a tu comentario en Veredillas FM`,
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="color: #6366f1;">¡Alguien ha respondido a tu comentario!</h1>
              <p>Hola <strong>${parentComment.name}</strong>,</p>
              <p><strong>${name}</strong> ha respondido a tu comentario en el episodio: <a href="${SITE_URL}/ep/${slug}">${slug}</a></p>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
                <p style="font-style: italic; margin: 0;">"${text}"</p>
              </div>
              <p>Puedes ver la respuesta y seguir la conversación aquí:</p>
              <a href="${SITE_URL}/ep/${slug}#comment-${comment._id}" style="display: inline-block; background-color: #6366f1; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Ver comentario</a>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #9ca3af;">Has recibido este correo porque comentaste en Veredillas FM. Si no deseas recibir más notificaciones, puedes ignorar este mensaje.</p>
            </div>
          `,
          bcc: [{ Email: ADMIN_EMAIL, Name: 'Pablo Luna' }]
        });
        return;
      }
    } catch (error) {
      console.error('Error sending reply notification:', error);
    }
  }

  // If no parentId or parent not found, notify Pablo (Top-level comment)
  if (!parentId || (parentId && isPending)) {
    try {
      const statusText = isPending ? ' (Pendiente de verificación)' : '';
      await sendEmail({
        to: ADMIN_EMAIL,
        toName: 'Pablo Luna',
        subject: `Nuevo comentario${statusText} en Veredillas FM: ${slug}`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #6366f1;">Nuevo comentario${statusText}</h1>
            <p>Se ha recibido un nuevo comentario en el episodio: <strong>${slug}</strong></p>
            <p><strong>Autor:</strong> ${name} (${authorEmail})</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
              <p style="margin: 0;">${text}</p>
            </div>
            ${isPending ? `<p style="color: #ef4444;"><strong>Nota:</strong> Este comentario aún no ha sido verificado por el autor.</p>` : ''}
            <a href="${SITE_URL}/ep/${slug}#comment-${comment._id}" style="display: inline-block; background-color: #6366f1; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; font-weight: bold;">Ver en la web</a>
          </div>
        `
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  }
}
