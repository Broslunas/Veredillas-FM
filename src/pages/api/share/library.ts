import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ShareDesign from '@/models/ShareDesign';

export const prerender = false;

// GET /api/share/library — list current user's saved story designs
export const GET: APIRoute = async ({ cookies }) => {
    try {
        const token = cookies.get('auth-token')?.value;
        if (!token) {
            return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
        }

        const userPayload = verifyToken(token);
        if (!userPayload) {
            return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });
        }

        await dbConnect();
        const designs = await ShareDesign.find({ userId: userPayload.userId })
            .sort({ createdAt: -1 })
            .lean();

        return new Response(JSON.stringify({ designs }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'private, no-cache',
            },
        });
    } catch (err) {
        console.error('[library GET] Error:', err);
        return new Response(JSON.stringify({ error: 'Error al obtener biblioteca' }), { status: 500 });
    }
};

// POST /api/share/library — save/duplicate a design to user's library
export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const token = cookies.get('auth-token')?.value;
        if (!token) {
            return new Response(JSON.stringify({ error: 'Debes iniciar sesión para guardar historias' }), { status: 401 });
        }

        const userPayload = verifyToken(token);
        if (!userPayload) {
            return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });
        }

        await dbConnect();
        const body = await request.json();
        const { model, name, slug, thumbnailUrl } = body;

        if (!model) {
            return new Response(JSON.stringify({ error: 'Falta el modelo del diseño' }), { status: 400 });
        }

        let savedDoc = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!savedDoc && attempts < maxAttempts) {
            attempts++;
            const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
            try {
                const newDesign = new ShareDesign({
                    shortId,
                    version: 2,
                    userId: userPayload.userId,
                    name: name || model.title || 'Mi Historia',
                    slug: slug || null,
                    thumbnailUrl: thumbnailUrl || null,
                    model,
                });
                savedDoc = await newDesign.save();
            } catch (err: any) {
                if (err?.code === 11000 && attempts < maxAttempts) continue;
                throw err;
            }
        }

        return new Response(JSON.stringify({ success: true, design: savedDoc }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[library POST] Error:', err);
        return new Response(JSON.stringify({ error: 'Error al guardar diseño en biblioteca' }), { status: 500 });
    }
};
