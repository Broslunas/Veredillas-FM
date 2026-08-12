import type { APIRoute } from 'astro';

export const prerender = false;

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const MAX_TEXTS = 50;
const MAX_TEXT_LENGTH = 500;

async function translateOne(text: string, target: string, source: string): Promise<string> {
  const url = `${ENDPOINT}?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream translate error ${res.status}`);
  const data = await res.json();
  const segments = Array.isArray(data?.[0]) ? data[0] : [];
  return segments.map((seg: unknown) => (Array.isArray(seg) ? seg[0] : '')).join('') || text;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const texts = Array.isArray(body?.texts) ? body.texts : null;
    const target = typeof body?.target === 'string' ? body.target : null;
    const source = typeof body?.source === 'string' ? body.source : 'es';

    if (!texts || texts.length === 0 || !target) {
      return new Response(JSON.stringify({ error: 'texts (array) y target (string) son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const limited = texts.slice(0, MAX_TEXTS).map((t: unknown) => String(t ?? '').slice(0, MAX_TEXT_LENGTH));

    const translations = await Promise.all(
      limited.map((t: string) => (t ? translateOne(t, target, source).catch(() => t) : ''))
    );

    return new Response(JSON.stringify({ translations }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (error) {
    console.error('[Translate API] Error:', error);
    return new Response(JSON.stringify({ error: 'No se pudo traducir el texto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
