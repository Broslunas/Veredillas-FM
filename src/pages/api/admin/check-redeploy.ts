import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * Convierte una cadena de duración (ej. "37 min", "1:20:30") a milisegundos.
 */
function parseDurationToMs(durationStr: string | undefined): number {
    if (!durationStr) return 0;
    
    let durationMs = 0;
    try {
        if (durationStr.toLowerCase().includes("min")) {
            durationMs = parseInt(durationStr) * 60 * 1000;
        } else if (durationStr.includes(":")) {
            const parts = durationStr.split(":").map(Number);
            if (parts.length === 2) durationMs = (parts[0] * 60 + parts[1]) * 1000;
            else if (parts.length === 3)
                durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
    } catch (e) {
        console.error("Error parsing duration:", durationStr, e);
    }
    return durationMs;
}

export const GET: APIRoute = async ({ request }) => {
    // 1. Verificación de seguridad
    // Vercel Cron Jobs puede enviar una cabecera de autorización para mayor seguridad
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Solo verificamos si el secreto está configurado para no bloquear el desarrollo local si no es necesario
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    // 2. Obtener todos los episodios
    const episodes = await getCollection('episodios');
    const now = new Date();
    
    // Tiempo de "ventana": Si terminó hace menos de 45 minutos (un poco más que el intervalo del cron)
    // dispararemos el redeploy para asegurarnos de que el sitio refleje el estado final.
    const WINDOW_MS = 45 * 60 * 1000;

    // 3. Buscar si algún estreno ha terminado recientemente
    const finishedRecently = episodes.filter(ep => {
        if (!ep.data.isPremiere) return false;
        
        const pubDate = new Date(ep.data.pubDate);
        const durationMs = parseDurationToMs(ep.data.duration);
        const endDate = new Date(pubDate.getTime() + durationMs);
        
        // El estreno ya terminó
        const isPast = endDate < now;
        // Terminó hace menos de 45 minutos
        const isRecent = (now.getTime() - endDate.getTime()) < WINDOW_MS;

        return isPast && isRecent;
    });

    if (finishedRecently.length > 0) {
        const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
        
        if (!hookUrl) {
            return new Response('Redeploy needed but VERCEL_DEPLOY_HOOK_URL is missing', { status: 500 });
        }

        try {
            console.log(`Triggering redeploy for ${finishedRecently.length} finished premieres.`);
            const response = await fetch(hookUrl, { method: 'POST' });
            
            if (response.ok) {
                return new Response(JSON.stringify({
                    message: 'Redeploy triggered successfully',
                    episodes: finishedRecently.map(e => e.data.title)
                }), { status: 200 });
            } else {
                return new Response('Failed to trigger Vercel hook', { status: 500 });
            }
        } catch (error) {
            return new Response('Error calling Vercel hook', { status: 500 });
        }
    }

    return new Response('No premieres finished recently. No redeploy needed.', { status: 200 });
};
