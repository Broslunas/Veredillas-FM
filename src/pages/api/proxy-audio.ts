
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response('Missing url parameter', { status: 400 });
    }

    try {
        const response = await fetch(targetUrl);
        
        if (!response.ok) {
             return new Response(`Error fetching audio: ${response.statusText}`, { status: response.status });
        }

        const newHeaders = new Headers();
        // Copy content-type
        const contentType = response.headers.get('Content-Type');
        if (contentType) newHeaders.set('Content-Type', contentType);
        
        // Copy content-length if available
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) newHeaders.set('Content-Length', contentLength);
        
        // Add CORS headers
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Cache-Control', 'public, max-age=3600'); 

        return new Response(response.body, {
            status: 200,
            headers: newHeaders
        });

    } catch (e: any) {
        return new Response(`Server Error: ${e.message}`, { status: 500 });
    }
}
