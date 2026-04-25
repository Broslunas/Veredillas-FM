import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getUserFromCookie } from '@/lib/auth';
import User from '@/models/User';

export const prerender = false;

// PUT /api/playlists/manager/[id] -> Update name/visibility
export const PUT: APIRoute = async ({ params, request }) => {
    try {
        const id = params.id;
        if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

        const cookieHeader = request.headers.get('cookie');
        const userPayload = getUserFromCookie(cookieHeader);
        if (!userPayload) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

        const body = await request.json();
        
        if (mongoose.connection.readyState !== 1) {
            const MONGODB_URI = import.meta.env.MONGODB_URI;
            if (MONGODB_URI) await mongoose.connect(MONGODB_URI);
        }

        const user = await User.findById(userPayload.userId);
        if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

        const playlist = user.playlists?.find((p: any) => p._id.toString() === id);
        if (!playlist) return new Response(JSON.stringify({ error: 'Playlist not found or you do not own it' }), { status: 404 });

        if (body.name !== undefined) playlist.name = body.name.trim();
        if (body.isPublic !== undefined) playlist.isPublic = !!body.isPublic;

        await user.save();

        return new Response(JSON.stringify({ success: true, playlist }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

// DELETE /api/playlists/manager/[id] -> Remove the playlist entirely
export const DELETE: APIRoute = async ({ params, request }) => {
    try {
        const id = params.id;
        if (!id) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 });

        const cookieHeader = request.headers.get('cookie');
        const userPayload = getUserFromCookie(cookieHeader);
        if (!userPayload) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

        if (mongoose.connection.readyState !== 1) {
            const MONGODB_URI = import.meta.env.MONGODB_URI;
            if (MONGODB_URI) await mongoose.connect(MONGODB_URI);
        }

        const user = await User.findById(userPayload.userId);
        if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

        const originalLength = user.playlists?.length || 0;
        
        user.playlists = user.playlists?.filter((p: any) => p._id.toString() !== id) as any;

        if (user.playlists?.length === originalLength) {
            return new Response(JSON.stringify({ error: 'Playlist not found' }), { status: 404 });
        }

        await user.save();

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
