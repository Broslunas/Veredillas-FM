import type { APIRoute } from 'astro';
import { getUserFromCookie } from '@/lib/auth';
import User from '@/models/User';
import dbConnect from '@/lib/mongodb';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const cookieHeader = request.headers.get('cookie');
        const userPayload = getUserFromCookie(cookieHeader);

        if (!userPayload) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
        }

        await dbConnect();
        const user = await User.findById(userPayload.userId);
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
        }

        const body = await request.json();
        const N8N_WEBHOOK_URL = "https://n8n.broslunas.com/webhook/clips-upload-vfm";
        const WEBHOOK_SECRET = import.meta.env.CONTACT_WEBHOOK_SECRET;

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WEBHOOK_SECRET}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error de n8n:', errorText);
            return new Response(JSON.stringify({ error: 'n8n respondió con error' }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
        console.error('Internal server error in social-webhook:', error);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
