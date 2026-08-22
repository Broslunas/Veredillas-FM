import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import EpisodeContent from '@/models/EpisodeContent';
import { getCollection } from '@/lib/content';
import { suggestQuotesFromTranscript } from '@/lib/gemini';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { slug } = body;

        if (!slug || typeof slug !== 'string') {
            return new Response(JSON.stringify({ error: 'Slug de episodio requerido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 1. Get episode metadata (title)
        const episodes = await getCollection('episodios');
        const episode = episodes.find((ep) => ep.slug === slug);
        const episodeTitle = (episode?.data as any)?.title || slug;

        // 2. Fetch transcript from Mongo (EpisodeContent)
        await dbConnect();
        const contentDoc = await EpisodeContent.findOne({ episodeSlug: slug });

        if (!contentDoc || !Array.isArray(contentDoc.transcription) || contentDoc.transcription.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Este episodio aún no tiene transcripción disponible para analizar.' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // 3. Call Gemini to suggest memorable quotes
        const quotes = await suggestQuotesFromTranscript(episodeTitle, contentDoc.transcription);

        return new Response(JSON.stringify({ quotes }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err: any) {
        console.error('[suggest-quote] Error:', err);
        const msg = err?.message || 'Error al obtener sugerencias de citas';
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
