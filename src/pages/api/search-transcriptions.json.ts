import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import EpisodeContent from '@/models/EpisodeContent';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();

  if (!q || q.length < 3) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await dbConnect();

    // Escapar regex
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const episodes = await EpisodeContent.find({
      deletedAt: null,
      status: { $ne: 'draft' },
      'transcription.text': regex,
    })
      .select('title slug image transcription')
      .limit(6)
      .lean();

    const results = episodes
      .map((ep: any) => {
        const matchingSegments = (ep.transcription || [])
          .filter((t: any) => t.text && regex.test(t.text))
          .slice(0, 2)
          .map((t: any) => {
            const lowerText = t.text.toLowerCase();
            const idx = lowerText.indexOf(q.toLowerCase());
            const start = Math.max(0, idx - 40);
            const end = Math.min(t.text.length, idx + q.length + 50);
            const rawSnippet = t.text.substring(start, end);
            const snippet = `${start > 0 ? '…' : ''}${rawSnippet}${end < t.text.length ? '…' : ''}`;
            return {
              time: t.time || '00:00',
              snippet,
              speaker: t.speaker,
            };
          });

        return {
          id: `tr-${ep.slug}`,
          slug: `/ep/${ep.slug}`,
          title: ep.title,
          image: ep.image,
          matches: matchingSegments,
        };
      })
      .filter((ep: any) => ep.matches.length > 0);

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error searching transcriptions:', error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
