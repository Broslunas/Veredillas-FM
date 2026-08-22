import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import ShareDesign from '@/models/ShareDesign';

export const prerender = false;

function generateShortId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const POST: APIRoute = async ({ request }) => {
    try {
        await dbConnect();
        const body = await request.json();

        // Detect payload version: v2 provides a `model` property (CardModel),
        // v1 legacy provides flat `{t, g, q, c, b, bc, img, u, es, v}` fields.
        const isV2 = body && typeof body === 'object' && 'model' in body;

        // Save with retry on shortId collision (E11000 duplicate key error)
        let savedDoc = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!savedDoc && attempts < maxAttempts) {
            attempts++;
            const shortId = generateShortId();
            try {
                const docData = isV2
                    ? {
                          shortId,
                          version: 2,
                          model: body.model,
                          slug: body.slug || null,
                          name: body.name || null,
                          thumbnailUrl: body.thumbnailUrl || null,
                      }
                    : {
                          shortId,
                          version: 1,
                          data: body,
                      };

                const newDesign = new ShareDesign(docData);
                savedDoc = await newDesign.save();
            } catch (err: any) {
                // MongoDB duplicate key error code is 11000
                if (err?.code === 11000 && attempts < maxAttempts) {
                    continue;
                }
                throw err;
            }
        }

        if (!savedDoc) {
            throw new Error('Failed to generate unique shortId after max attempts');
        }

        return new Response(JSON.stringify({ shortId: savedDoc.shortId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('API Save Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to save design' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
