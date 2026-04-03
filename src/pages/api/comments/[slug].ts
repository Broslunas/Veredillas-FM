import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';
import crypto from 'node:crypto';
import { getUserFromCookie } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await dbConnect();
    // Sort by newest first, only show verified comments
    const comments = await Comment.find({ slug, isVerified: true }).sort({ createdAt: -1 }).lean();

    // Check for authentication to determine if user liked comments
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    const currentUserId = userPayload?.userId;

    const commentsWithAvatar = comments.map((c: any) => {
      // Handle legacy comments that might not have an email
      const email = c.email ? c.email.trim().toLowerCase() : 'anonymous@example.com';
      const emailHash = crypto.createHash('md5').update(email).digest('hex');
      
      const likes = c.likes || [];
      const isLiked = currentUserId ? likes.includes(currentUserId) : false;

      return {
        ...c,
        avatar: `https://www.gravatar.com/avatar/${emailHash}?d=retro&s=100`,
        likesCount: likes.length,
        isLiked
      };
    });
    
    return new Response(JSON.stringify({ success: true, data: commentsWithAvatar }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const POST: APIRoute = async ({ params, request }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    let { name, email, text, rating } = body;
    rating = typeof rating === 'number' ? Math.min(5, Math.max(0, Math.round(rating))) : 0;

    // Check for authentication
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    const isAuthenticated = !!userPayload;

    // If authenticated, use payload data to ensure integrity (optional, but safer)
    // However, frontend sends name/email as hidden fields, so we can trust them if verified against payload
    // Or just trust the request if we verified the token.
    // Let's rely on the inputs but trust them more if authenticated.
    
    // Basic Validation
    if (!name || !email || !text) {
         return new Response(JSON.stringify({ success: false, error: 'Name, email, and text are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
    }

    // Clean data
    email = email.trim().toLowerCase();

    await dbConnect();
    
    // Logic split: Authenticated vs Guest
    if (isAuthenticated) {
        // --- AUTHENTICATED FLOW ---
        // Auto-verify comment
        const comment = await Comment.create({
            slug,
            name,
            email,
            text,
            rating,
            isVerified: true, // Auto-verified
            verificationToken: null
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Comment published successfully.', 
            pending: false, // Changed to false so UI knows it's live
            comment: comment // Return comment to append immediately if needed
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });

    } else {
        // --- GUEST FLOW (Existing) ---
        // Generate random token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create unverified comment
        const comment = await Comment.create({
          slug,
          name,
          email,
          text,
          rating,
          isVerified: false, 
          verificationToken
        });
        
        // Server-side Webhook Dispatch
        const origin = request.headers.get('origin') || import.meta.env.SITE || 'https://veredillasfm.es';
        const verificationLink = `${origin}/verify-comment?token=${verificationToken}`;
        const webhookSecret = import.meta.env.CONTACT_WEBHOOK_SECRET;

        try {
            await fetch('https://n8n.broslunas.com/webhook/veredillasfm-comments', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${webhookSecret}`
                },
                body: JSON.stringify({
                    name,
                    email,
                    text,
                    slug,
                    verificationLink
                })
            });
        } catch (webhookError) {
            console.error('Webhook dispatch failed:', webhookError);
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Comment pending verification. Check your email.', 
            pending: true
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to add comment' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { commentId } = await request.json();

    if (!commentId) {
      return new Response(JSON.stringify({ error: 'Comment ID missing' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await dbConnect();
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate deletion token
    const deletionToken = crypto.randomBytes(32).toString('hex');
    comment.deletionToken = deletionToken;
    await comment.save();

    // Server-side Webhook Dispatch
    const origin = request.headers.get('origin') || import.meta.env.SITE || 'https://veredillasfm.es';
    const deleteLink = `${origin}/verify-delete?token=${deletionToken}`;
    const webhookSecret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    try {
        await fetch('https://n8n.broslunas.com/webhook/veredillasfm-comments-delete', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${webhookSecret}`
            },
            body: JSON.stringify({
                name: comment.name,
                email: comment.email,
                text: comment.text,
                slug: comment.slug,
                deleteLink
            })
        });
    } catch (webhookError) {
        console.error('Webhook dispatch failed:', webhookError);
    }

    return new Response(JSON.stringify({ 
        success: true, 
        message: 'Verification email sent'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to process delete request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
