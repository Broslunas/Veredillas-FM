import type { APIRoute } from 'astro';
import { verifyToken } from '../../../lib/auth';
import User from '../../../models/User';
import mongoose from 'mongoose';

export const GET: APIRoute = async ({ request, url, cookies }) => {
    try {
        const slug = url.searchParams.get('slug');
        if (!slug) {
            return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = cookies.get('auth-token')?.value;
        if (!token) {
            return new Response(JSON.stringify({ 
                loggedIn: false, 
                savedProgress: 0, 
                listenedEpisodes: [], 
                favoriteEpisodes: [] 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userPayload = verifyToken(token);
        if (!userPayload) {
            return new Response(JSON.stringify({ 
                loggedIn: false, 
                savedProgress: 0, 
                listenedEpisodes: [], 
                favoriteEpisodes: [] 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (mongoose.connection.readyState !== 1) {
            const MONGODB_URI = import.meta.env.MONGODB_URI;
            if (MONGODB_URI) await mongoose.connect(MONGODB_URI);
        }

        const user = await User.findById(userPayload.userId);
        if (!user) {
            return new Response(JSON.stringify({ 
                loggedIn: false, 
                savedProgress: 0, 
                listenedEpisodes: [], 
                favoriteEpisodes: [] 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let savedProgress = 0;
        let listenedEpisodes: string[] = [];
        let favoriteEpisodes: string[] = [];

        if (user.playbackHistory) {
            const historyItem = user.playbackHistory.find((h: any) => h.episodeSlug === slug);
            if (historyItem && !historyItem.completed) {
                savedProgress = historyItem.progress || 0;
            }
            listenedEpisodes = user.playbackHistory.map((h: any) => h.episodeSlug);
        }

        if (user.favorites) {
            favoriteEpisodes = user.favorites;
        }

        // Do not cache this response
        return new Response(JSON.stringify({
            loggedIn: true,
            savedProgress,
            listenedEpisodes,
            favoriteEpisodes
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            }
        });

    } catch (error) {
        console.error("Error fetching user episode state:", error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
