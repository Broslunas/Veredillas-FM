import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import Comment from '../../../models/Comment';
import { getUserFromCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
    try {
        const cookieHeader = request.headers.get('cookie');
        const userPayload = getUserFromCookie(cookieHeader);

        if (!userPayload) {
             return new Response(JSON.stringify({ success: false, error: 'Debes iniciar sesión para dar like' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
              });
        }

        const { commentId } = await request.json();
        
        await dbConnect();

        const comment = await Comment.findById(commentId);
        if(!comment) {
            return new Response(JSON.stringify({ success: false, error: 'Comentario no encontrado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
              });
        }
        
        if(!comment.likes) comment.likes = [];
        
        const userId = userPayload.userId;
        const index = comment.likes.indexOf(userId);
        let liked = false;

        if (index === -1) {
            comment.likes.push(userId);
            liked = true;
        } else {
            comment.likes.splice(index, 1);
            liked = false;
        }

        await comment.save();

        return new Response(JSON.stringify({ 
            success: true, 
            liked,
            likesCount: comment.likes.length
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ success: false, error: 'Error del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
    }
}
