import type { APIRoute } from 'astro';
import dbConnect from '../../../../lib/mongodb';
import { getUserFromCookie } from '../../../../lib/auth';
import User from '../../../../models/User';
import { sendEmail } from '../../../../lib/mailjet';

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

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #e11d48;">Advertencia Importante: Cumplimiento de Términos y Condiciones</h2>
        <p>Hola <strong>${targetUser.name}</strong>,</p>
        <p>Te escribimos desde el equipo de administración de <strong>Veredillas FM</strong> para informarte que hemos detectado una posible infracción en el uso de tu cuenta relacionada con el sistema de gamificación y tiempos de escucha.</p>
        <p style="background: #fff1f2; padding: 15px; border-left: 4px solid #e11d48; color: #9f1239;">
          <strong>Motivo:</strong> Manipulación artificial del tiempo de escucha en el ranking de la comunidad (reproducciones en bucle, en segundo plano o en silencio).
        </p>
        <p>Según nuestros <a href="https://www.veredillasfm.es/terminos-y-condiciones">Términos y Condiciones</a> (Sección 4), el uso de métodos automatizados o la reproducción artificial para subir en los rankings no está permitido.</p>
        <p>Esta es una <strong>advertencia formal</strong>. Te pedimos que ceses este comportamiento inmediatamente para evitar futuras sanciones que podrían incluir:</p>
        <ul>
          <li>Anulación del tiempo de escucha acumulado.</li>
          <li>Reinicio de tu nivel y racha.</li>
          <li>Suspensión temporal o permanente de tu cuenta.</li>
        </ul>
        <p>Queremos que la competencia por ser el top oyente sea justa para todos. Si crees que esto es un error, por favor ponte en contacto con nosotros.</p>
        <p>Atentamente,<br>El equipo de Veredillas FM</p>
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
          Este es un correo automático, por favor no respondas directamente.
        </div>
      </div>
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
