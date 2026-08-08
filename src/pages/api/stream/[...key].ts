import type { APIRoute } from 'astro';
import { getDirectR2StreamUrl } from '@/lib/r2';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  try {
    let key = params.key;
    if (!key) {
      const url = new URL(request.url);
      key = url.searchParams.get('key') || '';
    }

    if (!key) {
      return new Response('Media key is required', { status: 400 });
    }

    const decodedKey = decodeURIComponent(key);

    // Generate direct Cloudflare R2 presigned URL
    const directR2Url = await getDirectR2StreamUrl(decodedKey);

    // Redirect client directly to R2 so video bytes NEVER pass through Vercel
    return new Response(null, {
      status: 307, // Temporary Redirect (preserves Range header for HTML5 video)
      headers: {
        Location: directR2Url,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error generating direct R2 stream URL:', error);
    return new Response('Internal Server Error streaming media', { status: 500 });
  }
};
