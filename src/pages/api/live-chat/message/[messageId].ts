import type { APIRoute } from 'astro';
import dbConnect from '../../../../lib/mongodb';
import ChatMessage from '../../../../models/ChatMessage';
import { verifyToken } from '../../../../lib/auth';
import User from '../../../../models/User';
import DeletedMessageLog from '../../../../models/DeletedMessageLog';

export const prerender = false;

export const DELETE: APIRoute = async ({ request, params }) => {
    const { messageId } = params;
    
    if (!messageId) {
        return new Response('Message ID required', { status: 400 });
    }

    try {
        const token = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1];
        
        if (!token) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
             return new Response(JSON.stringify({ success: false, error: 'Invalid Token' }), { status: 401 });
        }
        
        await dbConnect();
        
        // Verify Admin Status
        const user = await User.findById(payload.userId);
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
        }
        
        const msg = await ChatMessage.findById(messageId);
        if (msg) {
             const room = msg.room;
             await ChatMessage.findByIdAndDelete(messageId);
             
             // Log deletion for client sync
             await DeletedMessageLog.create({ messageId, room });
        }
        
        return new Response(JSON.stringify({ success: true }), { status: 200 });
        
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ success: false, error: 'Server Error' }), { status: 500 });
    }
}

export const PATCH: APIRoute = async ({ request, params }) => {
    const { messageId } = params;
    
    if (!messageId) {
        return new Response('Message ID required', { status: 400 });
    }

    try {
        const token = request.headers.get('cookie')?.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1];
        
        if (!token) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload) {
             return new Response(JSON.stringify({ success: false, error: 'Invalid Token' }), { status: 401 });
        }
        
        await dbConnect();
        
        // Verify Admin Status
        const user = await User.findById(payload.userId);
        if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
            return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
        }

        const body = await request.json();
        const { isPinned } = body;
        
        const msg = await ChatMessage.findById(messageId);
        if (!msg) {
             return new Response(JSON.stringify({ success: false, error: 'Message not found' }), { status: 404 });
        }

        if (isPinned) {
            // Unpin others in the same room
            await ChatMessage.updateMany({ room: msg.room }, { $set: { isPinned: false } });
        }

        msg.isPinned = isPinned;
        await msg.save();
        
        return new Response(JSON.stringify({ success: true, message: msg }), { status: 200 });
        
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ success: false, error: 'Server Error' }), { status: 500 });
    }
}
