import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import { getUserFromCookie } from '@/lib/auth';
import WrappedSettings from '@/models/WrappedSettings';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    try {
        const cookieHeader = request.headers.get('cookie');
        const userPayload = getUserFromCookie(cookieHeader);
        if (!userPayload) {
            return new Response(JSON.stringify({ active: false }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        await dbConnect();
        const settings = await WrappedSettings.findOne();
        if (settings?.isActive) {
            const y = settings.year || new Date().getFullYear();
            return new Response(JSON.stringify({
                active: true,
                yearLabel: `${y}/${y + 1}`
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        return new Response(JSON.stringify({ active: false }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch {
        return new Response(JSON.stringify({ active: false }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
};
