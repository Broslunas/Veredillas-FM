
import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';
import crypto from 'node:crypto';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
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

    const commentsWithAvatar = comments.map((c: any) => {
      // Handle legacy comments that might not have an email
      const email = c.email ? c.email.trim().toLowerCase() : 'anonymous@example.com';
      const emailHash = crypto.createHash('md5').update(email).digest('hex');
      
      return {
        ...c,
        avatar: `https://www.gravatar.com/avatar/${emailHash}?d=retro&s=100`
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
    let { name, email, text } = body;

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
    
    // Generate random token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create unverified comment
    const comment = await Comment.create({
      slug,
      name,
      email,
      text,
      isVerified: false, 
      verificationToken
    });
    
    // Send to n8n Webhook
    try {
        const webhookUrl = 'https://n8n.broslunas.com/webhook/veredillasfm-comments';
        const hostname = request.headers.get('host') || 'veredillasfm.es';
        const protocol = hostname.includes('localhost') ? 'http' : 'https';
        const verificationLink = `${protocol}://${hostname}/verify-comment?token=${verificationToken}`;
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                email,
                text,
                slug,
                verificationLink
            })
        });

        if (!response.ok) {
            console.error(`Webhook Error: ${response.status} ${response.statusText}`, await response.text());
            await Comment.findByIdAndDelete(comment._id); // Rollback
            throw new Error(`Failed to send verification email. Status: ${response.status}`);
        }
        
    } catch (webhookError) {
        console.error('Webhook failed:', webhookError);
        // Ensure we rollback if it wasn't already deleted
        await Comment.findByIdAndDelete(comment._id); 
        
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Could not send verification email. Please try again later.' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ 
        success: true, 
        message: 'Comment pending verification', 
        pending: true 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

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

    // Trigger Webhook
    try {
        const webhookUrl = 'https://n8n.broslunas.com/webhook/veredillasfm-comments-delete';
        const hostname = request.headers.get('host') || 'veredillasfm.es';
        const protocol = hostname.includes('localhost') ? 'http' : 'https';
        const deleteLink = `${protocol}://${hostname}/verify-delete?token=${deletionToken}`;
        
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: comment.name,
                email: comment.email,
                text: comment.text,
                slug: comment.slug,
                deleteLink
            })
        });
    } catch (e) {
        console.error('Webhook failed', e);
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
