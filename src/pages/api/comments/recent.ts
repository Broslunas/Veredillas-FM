
import type { APIRoute } from 'astro';
import dbConnect from './../../../lib/mongodb';
import Comment from './../../../models/Comment';
import crypto from 'node:crypto';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    await dbConnect();
    
    // Fetch latest 12 verified comments from anywhere
    const comments = await Comment.find({ isVerified: true })
      .sort({ createdAt: -1 })
      .limit(12);

    const commentsWithAvatar = comments.map((c) => {
      const email = c.email ? c.email.trim().toLowerCase() : 'anonymous@example.com';
      const emailHash = crypto.createHash('md5').update(email).digest('hex');
      
      return {
        ...c.toObject(),
        avatar: `https://www.gravatar.com/avatar/${emailHash}?d=retro&s=100`
      };
    });
    
    return new Response(JSON.stringify({ success: true, data: commentsWithAvatar }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch comments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
