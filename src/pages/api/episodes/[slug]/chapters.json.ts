import type { APIRoute } from 'astro';
import { getEntry } from '@/lib/content';

export const prerender = false;

function parseTimeToSeconds(time: string): number {
  const parts = (time || '').trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
}

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // getEntry excludes drafts and trashed episodes by default, so an
  // unpublished episode's chapters are just as hidden as the episode itself.
  const entry = await getEntry('episodios', slug);
  if (!entry) {
    return new Response(JSON.stringify({ error: 'Episodio no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sections: { title: string; time: string }[] = Array.isArray(entry.data.sections)
    ? entry.data.sections
    : [];
  const chapters: { startTime: number; title: string }[] = sections
    .map((s) => ({
      startTime: parseTimeToSeconds(s.time),
      title: s.title,
    }))
    .filter((c: { startTime: number; title: string }) => Number.isFinite(c.startTime))
    .sort((a: { startTime: number }, b: { startTime: number }) => a.startTime - b.startTime);

  return new Response(JSON.stringify({ version: '1.2.0', chapters }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json+chapters',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=1800',
    },
  });
};
