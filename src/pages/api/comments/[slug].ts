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

    // Check for authentication to determine if user liked comments or owns them
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    const currentUserId = userPayload?.userId;
    
    let currentUserEmail: string | null = null;
    let isModerator = false;
    
    if (userPayload) {
        const User = (await import('../../../models/User')).default;
        const user = await User.findById(userPayload.userId);
        if (user) {
            currentUserEmail = user.email.toLowerCase();
            isModerator = user.role === 'admin' || user.role === 'owner';
        }
    }

    const commentsWithDetails = comments.map((c: any) => {
      // Handle legacy comments that might not have an email
      const email = c.email ? c.email.trim().toLowerCase() : 'anonymous@example.com';
      const emailHash = crypto.createHash('md5').update(email).digest('hex');
      
      const likes = c.likes || [];
      const isLiked = currentUserId ? likes.includes(currentUserId) : false;
      const isMine = currentUserEmail ? email === currentUserEmail : false;

      // Extract only safe public fields
      const { email: _, deletionToken: __, ...publicData } = c;

      return {
        ...publicData,
        avatar: `https://www.gravatar.com/avatar/${emailHash}?d=retro&s=100`,
        likesCount: likes.length,
        isLiked,
        isMine,
        isModerator,
        parentId: c.parentId || null,
        attachments: c.attachments || []
      };
    });
    
    return new Response(JSON.stringify({ success: true, data: commentsWithDetails, isModerator }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
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
    let { name, email, text, rating, parentId, attachments } = body;
    rating = typeof rating === 'number' ? Math.min(5, Math.max(0, Math.round(rating))) : 0;
    
    // Check for authentication
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    const isAuthenticated = !!userPayload;

    // Basic Validation: Text is required UNLESS there's a rating > 0 or attachments
    if (!name || !email || (!text && rating === 0 && (!attachments || attachments.length === 0))) {
         return new Response(JSON.stringify({ success: false, error: 'Name, email, and content (text/rating/attachment) are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
    }

    // Clean data
    email = email.trim().toLowerCase();
    attachments = Array.isArray(attachments) ? attachments : [];

    await dbConnect();
    
    const commentData = {
        slug,
        name,
        email,
        text,
        rating,
        parentId: parentId || null,
        attachments,
        isVerified: isAuthenticated,
        verificationToken: isAuthenticated ? null : crypto.randomBytes(32).toString('hex')
    };

    const comment = await Comment.create(commentData);

    // --- MENTIONS & NOTIFICATIONS ---
    if (text) {
        const mentionRegex = /@([^ \n\r\t.,!?;:]+)/g;
        const matches = text.match(mentionRegex);
        if (matches) {
            const usernames = matches.map((m: string) => m.substring(1));
            // Trigger background notification via webhook
            const webhookSecret = import.meta.env.CONTACT_WEBHOOK_SECRET;
            const origin = request.headers.get('origin') || import.meta.env.SITE || 'https://veredillasfm.es';
            
            try {
                // We send it to a general mention webhook
                await fetch('https://n8n.broslunas.com/webhook/veredillasfm-mentions', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${webhookSecret}`
                    },
                    body: JSON.stringify({
                        author: name,
                        text,
                        slug,
                        usernames,
                        commentUrl: `${origin}/ep/${slug}#comment-${comment._id}`
                    })
                });
            } catch (e) {
                console.error('Mention notification failed:', e);
            }
        }
    }

    if (isAuthenticated) {
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Comment published successfully.', 
            pending: false,
            comment: comment 
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
    } else {
        // --- GUEST FLOW (Existing) ---
        const origin = request.headers.get('origin') || import.meta.env.SITE || 'https://veredillasfm.es';
        const verificationLink = `${origin}/verify-comment?token=${commentData.verificationToken}`;
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

    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    await dbConnect();
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is authorized for immediate deletion
    let isAuthorized = false;
    if (userPayload) {
        // Find full user to check role
        const User = (await import('../../../models/User')).default;
        const user = await User.findById(userPayload.userId);
        if (user) {
            const isAdmin = user.role === 'admin' || user.role === 'owner';
            const isAuthor = user.email.toLowerCase() === comment.email.toLowerCase();
            if (isAdmin || isAuthor) isAuthorized = true;
        }
    }

    if (isAuthorized) {
        // Immediate deletion
        await Comment.findByIdAndDelete(commentId);
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Eliminado correctamente',
            immediate: true
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    // Generate deletion token (Email verification flow)
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
        message: 'Email de verificación enviado'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: 'Error al procesar la solicitud' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
