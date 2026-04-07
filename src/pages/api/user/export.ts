import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Comment from '../../../models/Comment';
import EpisodeReaction from '../../../models/EpisodeReaction';
import ChatMessage from '../../../models/ChatMessage';
import UserAchievement from '../../../models/UserAchievement';
import QuizResult from '../../../models/QuizResult';
import ListenEvent from '../../../models/ListenEvent';
import UnlockedCard from '../../../models/UnlockedCard';
import InterviewRequest from '../../../models/InterviewRequest';
import AdmZip from 'adm-zip';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Authenticate user
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Debes iniciar sesión para exportar tus datos.' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await dbConnect();
    
    // Fetch all user data
    const user = await User.findById(userPayload.userId).lean();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado.' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Gather all related data
    const [comments, reactions, messages, achievements, quizzes, events, unlockedCards, interviewRequests] = await Promise.all([
      Comment.find({ email: user.email }).lean(),
      EpisodeReaction.find({ userId: user._id }).lean(),
      ChatMessage.find({ 'user.userId': user._id.toString() }).lean(),
      UserAchievement.find({ userId: user._id }).lean(),
      QuizResult.find({ userId: user._id }).lean(),
      ListenEvent.find({ userId: user._id }).lean(),
      UnlockedCard.find({ userId: user._id }).lean(),
      InterviewRequest.find({ email: user.email }).lean()
    ]);

    // Create ZIP
    const zip = new AdmZip();

    // Helper to format JSON with indentation
    const formatJSON = (data: any) => Buffer.from(JSON.stringify(data, null, 2));

    // Add files to ZIP
    zip.addFile('Perfil.json', formatJSON(user));
    zip.addFile('Comentarios.json', formatJSON(comments));
    zip.addFile('Reacciones_y_Favoritos.json', formatJSON(reactions));
    zip.addFile('Mensajes_Chat.json', formatJSON(messages));
    zip.addFile('Logros_Desbloqueados.json', formatJSON(achievements));
    zip.addFile('Resultados_Quizzes.json', formatJSON(quizzes));
    zip.addFile('Historial_de_Escucha.json', formatJSON(events));
    zip.addFile('Tarjetas_Desbloqueadas.json', formatJSON(unlockedCards));
    zip.addFile('Solicitudes_de_Entrevista.json', formatJSON(interviewRequests));

    // Add a README file
    const readmeContent = `
# Exportación de Datos - Veredillas FM
Generado el: ${new Date().toLocaleString('es-ES')}
Usuario: ${user.name} (${user.email})

Este archivo ZIP contiene todos los datos asociados a tu cuenta en Veredillas FM, cumpliendo con el Derecho a la Portabilidad (RGPD).

Archivos incluidos:
- Perfil.json: Datos básicos del perfil, preferencias y streaks.
- Comentarios.json: Todos los comentarios realizados en episodios.
- Reacciones_y_Favoritos.json: Tus "Me gusta" y episodios marcados como favoritos.
- Mensajes_Chat.json: Tu actividad en el chat en vivo.
- Logros_Desbloqueados.json: Historial de logros obtenidos.
- Resultados_Quizzes.json: Puntuaciones en los cuestionarios de los episodios.
- Historial_de_Escucha.json: Eventos de reproducción y tiempo de escucha.
- Tarjetas_Desbloqueadas.json: Tu colección de tarjetas de invitados.
- Solicitudes_de_Entrevista.json: Tus peticiones para ser entrevistado en el programa.

Si tienes alguna duda, contáctanos en contacto@veredillasfm.es
    `.trim();
    zip.addFile('LEEME.txt', Buffer.from(readmeContent));

    const zipBuffer = zip.toBuffer();

    // Return the ZIP file
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="veredillas-fm-datos-${user.name.replace(/\s+/g, '-').toLowerCase()}.zip"`,
        'Cache-Control': 'no-cache'
      },
    });

  } catch (error) {
    console.error('Error exporting user data:', error);
    return new Response(JSON.stringify({ error: 'Error interno al generar el archivo de exportación.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
