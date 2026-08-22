import type { APIRoute } from 'astro';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ShareDesign from '@/models/ShareDesign';

export const prerender = false;

// GET /api/share/library/[id]
export const GET: APIRoute = async ({ params, cookies }) => {
    try {
        const { id } = params;
        const token = cookies.get('auth-token')?.value;
        if (!token) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });

        const userPayload = verifyToken(token);
        if (!userPayload) return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });

        await dbConnect();
        const design = await ShareDesign.findOne({ _id: id, userId: userPayload.userId }).lean();

        if (!design) return new Response(JSON.stringify({ error: 'Diseño no encontrado' }), { status: 404 });

        return new Response(JSON.stringify({ design }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[library ID GET] Error:', err);
        return new Response(JSON.stringify({ error: 'Error al obtener diseño' }), { status: 500 });
    }
};

// DELETE /api/share/library/[id]
export const DELETE: APIRoute = async ({ params, cookies }) => {
    try {
        const { id } = params;
        const token = cookies.get('auth-token')?.value;
        if (!token) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });

        const userPayload = verifyToken(token);
        if (!userPayload) return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });

        await dbConnect();
        const res = await ShareDesign.deleteOne({ _id: id, userId: userPayload.userId });

        if (res.deletedCount === 0) {
            return new Response(JSON.stringify({ error: 'Diseño no encontrado o no autorizado' }), { status: 404 });
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[library ID DELETE] Error:', err);
        return new Response(JSON.stringify({ error: 'Error al eliminar diseño' }), { status: 500 });
    }
};

// PATCH /api/share/library/[id]
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
    try {
        const { id } = params;
        const token = cookies.get('auth-token')?.value;
        if (!token) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });

        const userPayload = verifyToken(token);
        if (!userPayload) return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });

        const body = await request.json();
        await dbConnect();

        const updateFields: Record<string, any> = {};
        if (body.name) updateFields.name = body.name;
        if (body.model) updateFields.model = body.model;
        if (body.thumbnailUrl) updateFields.thumbnailUrl = body.thumbnailUrl;

        const design = await ShareDesign.findOneAndUpdate(
            { _id: id, userId: userPayload.userId },
            { $set: updateFields },
            { new: true }
        );

        if (!design) return new Response(JSON.stringify({ error: 'Diseño no encontrado' }), { status: 404 });

        return new Response(JSON.stringify({ success: true, design }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[library ID PATCH] Error:', err);
        return new Response(JSON.stringify({ error: 'Error al actualizar diseño' }), { status: 500 });
    }
};
