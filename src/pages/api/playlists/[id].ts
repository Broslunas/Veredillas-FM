import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { getCollection } from 'astro:content';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
    try {
        const id = params.id;
        if (!id) return new Response('Bad Request', { status: 400 });

        if (mongoose.connection.readyState !== 1) {
            const MONGODB_URI = import.meta.env.MONGODB_URI;
            if (MONGODB_URI) await mongoose.connect(MONGODB_URI);
        }

        const cookieHeader = request.headers.get('cookie');
        const userPayload = getUserFromCookie(cookieHeader);

        const foundUser = await User.findOne({ 'playlists._id': id });
        if (!foundUser) return new Response('Not Found', { status: 404 });

        const playlist = foundUser.playlists?.find((p: any) => p._id.toString() === id);
        if (!playlist) return new Response('Not Found', { status: 404 });

        let isOwner = false;
        if (userPayload && foundUser._id.toString() === userPayload.userId) {
            isOwner = true;
        }

        if (!playlist.isPublic && !isOwner) {
            return new Response('Forbidden', { status: 403 });
        }

        // Fetch all episodes metadata
        const allEpisodes = await getCollection('episodios');
        const episodeMap = new Map(allEpisodes.map(ep => [ep.slug, ep]));

        // Populate playlist episodes
        const populatedEpisodes = (playlist.episodes || [])
            .map((slug: string) => episodeMap.get(slug))
            .map((ep: any) => {
                if (!ep) return null;
                return {
                    slug: ep.slug,
                    title: ep.data.title,
                    image: ep.data.image,
                    duration: ep.data.duration
                };
            })
            .filter((ep: any) => ep !== null);

        return new Response(JSON.stringify({
            name: playlist.name,
            episodes: populatedEpisodes
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('API Error /playlists/[id]:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};
