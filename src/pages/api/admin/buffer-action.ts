import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    const BUFFER_TOKEN = import.meta.env.BUFFER_ACCESS_TOKEN;

    if (!BUFFER_TOKEN) {
        return new Response(JSON.stringify({ error: "Token no encontrado." }), { status: 401 });
    }

    try {
        const data = await request.json();
        
        if (data.action === 'publish_now') {
            // Buffer REST API to share an update immediately
            const res = await fetch(`https://api.bufferapp.com/1/updates/${data.id}/share.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BUFFER_TOKEN}`
                }
            });
            
            const rawText = await res.text();
            let result: any = {};
            if (rawText) {
                try {
                    result = JSON.parse(rawText);
                } catch(e) {
                    // Si falla el parseo, guardamos raw text
                    result.message = rawText;
                }
            }
            
            if (!res.ok) {
                return new Response(JSON.stringify({ error: result.error || result.message || `Buffer rechazó la operación (Cód. ${res.status})` }), { status: res.status });
            }
            return new Response(JSON.stringify({ success: true, data: result }), { status: 200 });
        }
        
        return new Response(JSON.stringify({ error: "Accion no soportada" }), { status: 400 });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message || "Error interno del servidor" }), { status: 500 });
    }
};
