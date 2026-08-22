import type { APIRoute } from 'astro';
import { getCollection } from '@/lib/content';
import { renderCardPng } from '@/lib/story-card/renderSatori';
import { getLook } from '@/lib/story-card/looks';
import type { CardFormat, CardModel } from '@/lib/story-card/types';

export const prerender = false;

// ──────────────────────────────────────────────
// GET /api/episodes/story?slug=my-episode-slug&format=story|post&look=classic|midnight|sunset|minimalist
// Returns a PNG image rendered via the shared story-card engine.
// ──────────────────────────────────────────────
export const GET: APIRoute = async ({ url }) => {
    const slug = url.searchParams.get('slug');
    const rawFormat = url.searchParams.get('format');
    const lookId = url.searchParams.get('look') || 'classic';

    const format: CardFormat = rawFormat === 'post' ? 'post' : 'story';

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing "slug" query parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Find the episode
    const episodes = await getCollection('episodios');
    const episode = episodes.find(ep => ep.slug === slug);

    if (!episode) {
        return new Response(JSON.stringify({ error: `Episode not found: ${slug}` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { title, image, participants } = episode.data as {
        title?: string;
        image?: string;
        participants?: string[];
    };

    const guestsArray = participants || [];
    const guestsLabel = guestsArray.join('  •  ');
    const look = getLook(lookId);

    // Build model with format support
    const model: CardModel = {
        lookId: look.id,
        format,
        accent: look.accentDefault,
        title: title || '',
        guests: guestsLabel,
        quote: '',
        background: look.background,
        coverImageUrl: image || '/logo.webp',
        websiteLabel: 'veredillasfm.es',
        elements: {
            ...look.defaultLayout[format],
            guest: {
                ...look.defaultLayout[format].guest,
                visible: guestsArray.length > 0,
            },
        },
    };

    try {
        const pngBuffer = await renderCardPng(model, look);

        return new Response(new Uint8Array(pngBuffer), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600, s-maxage=86400',
                'Content-Disposition': `inline; filename="Veredillas_${format === 'post' ? 'Post' : 'Story'}_${slug}.png"`,
            },
        });
    } catch (err) {
        console.error('[story-api] Failed to render card PNG:', err);
        return new Response(JSON.stringify({ error: 'Failed to render card PNG' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
