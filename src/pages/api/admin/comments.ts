import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

async function checkAdmin(request: Request) {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    if (!userPayload) return false;
    
    await dbConnect();
    const user = await User.findById(userPayload.userId);
    return user && (user.role === 'admin' || user.role === 'owner');
}

export const GET: APIRoute = async ({ request }) => {
    if (!(await checkAdmin(request))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    try {
        await dbConnect();
        const comments = await Comment.find({}).sort({ createdAt: -1 }).lean();
        return new Response(JSON.stringify({ success: true, data: comments }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

export const DELETE: APIRoute = async ({ request }) => {
    if (!(await checkAdmin(request))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    try {
        const { id } = await request.json();
        await dbConnect();
        await Comment.findByIdAndDelete(id);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}

export const PATCH: APIRoute = async ({ request }) => {
    if (!(await checkAdmin(request))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }

    try {
        const { id, isVerified } = await request.json();
        await dbConnect();
        await Comment.findByIdAndUpdate(id, { isVerified });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
}
