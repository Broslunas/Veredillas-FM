import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';
import dbConnect from '../../../lib/mongodb';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
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

        const clientId = import.meta.env.GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = import.meta.env.GOOGLE_REFRESH_TOKEN;

        if (!refreshToken) {
            return new Response(JSON.stringify({ error: 'Google Drive no configurado' }), { status: 500 });
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const data = await response.json();

        if (data.access_token) {
            return new Response(JSON.stringify({ access_token: data.access_token }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            console.error('Error refreshing Google token:', data);
            return new Response(JSON.stringify({ error: 'Error al obtener token' }), { status: 500 });
        }
    } catch (error) {
        console.error('Internal server error in drive-token:', error);
        return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
    }
};
