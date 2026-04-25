import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import ShareDesign from '@/models/ShareDesign';

export const POST: APIRoute = async ({ request }) => {
    try {
        await dbConnect();
        const body = await request.json();
        
        // Use a short, unique ID
        const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const newDesign = new ShareDesign({
            shortId,
            data: body
        });
        
        await newDesign.save();
        
        return new Response(JSON.stringify({ shortId }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('API Save Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to save design' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
