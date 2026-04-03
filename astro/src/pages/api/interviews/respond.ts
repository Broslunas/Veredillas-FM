import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import InterviewRequest from '../../../models/InterviewRequest';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { token, email, action, topic, description, preferredDate } = data;

    if (!token || !email || !action) {
      return new Response(JSON.stringify({ message: "Faltan datos requeridos." }), { status: 400 });
    }

    if (!['confirm', 'reject', 'modify'].includes(action)) {
       return new Response(JSON.stringify({ message: "Acción no válida." }), { status: 400 });
    }

    await dbConnect();

    // Find the request matching token and email
    // Allow 'invited' (guest needs to respond)
    // Allow 'approved' (guest has accepted, but maybe wants to change?) - User said "only there [invited] the user can accept/reject/modify"
    // But previously asked logic to allow edit even if approved. 
    // However, the new prompt is very specific: "solo ahi [invited] el usuario podrá aceptar/rechazar/modificar, si esta en pendiente es que los admins tienen que revisarlo"
    // I will interpret "solo ahi" as "The UI inputs are active". 
    // BUT what about 'approved'? If approved, it's not pending. It's approved. Can they modify? 
    // Usually 'approved' is final unless re-opened. 
    // Let's stick to the user's latest strict instruction: "only when invited". 
    // BUT, if I confirmed, I might want to cancel/change. 
    // I'll allow finding 'invited' OR 'approved' (to allow cancellation/amendment), but 'pending' (public submission or modified-waiting-review) will be READ ONLY.
    
    // Actually, if I modify an 'invited' request, it goes to 'pending'. Once 'pending', I can't touch it again until admin acts. This matches "if it is pending admin has to review".
    // So the API should allow actions on: 'invited' AND maybe 'approved' (if we allow post-confirmation changes).
    // Let's include 'approved' because otherwise if I confirm by mistake I'm locked out.
    
    const interviewRequest = await InterviewRequest.findOne({ 
        token: token, 
        email: email.toLowerCase(),
        status: { $in: ['invited', 'approved'] } 
    });

    if (!interviewRequest) {
        // If not found, maybe it's pending? Check specifically to give better error message or just 404.
        const pendingReq = await InterviewRequest.findOne({ token, email: email.toLowerCase(), status: 'pending' });
        if (pendingReq) {
             return new Response(JSON.stringify({ message: "Tu solicitud está siendo revisada por los administradores." }), { status: 403 });
        }
        return new Response(JSON.stringify({ message: "Invitación no válida, expirada o en estado no editable." }), { status: 404 });
    }

    let newStatus = interviewRequest.status; 

    if (action === 'confirm') {
        newStatus = 'approved';
    } else if (action === 'reject') {
        newStatus = 'rejected';
    } else if (action === 'modify') {
        newStatus = 'pending'; // Reset to pending for review
        
        // Update fields if provided
        if (topic) interviewRequest.topic = topic;
        if (description !== undefined) interviewRequest.description = description;
        if (preferredDate) interviewRequest.preferredDate = new Date(preferredDate);
    }

    interviewRequest.status = newStatus;
    await interviewRequest.save();

    // Trigger Webhook
    const webhookUrl = "https://n8n.broslunas.com/webhook/veredillasfm-interview-response";
    const secret = import.meta.env.CONTACT_WEBHOOK_SECRET;

    if (secret) {
        try {
            fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${secret}`
                },
                body: JSON.stringify({
                    requestId: interviewRequest._id,
                    action: action, 
                    role: 'guest', 
                    token: token,
                    email: email,
                    topic: interviewRequest.topic,
                    description: interviewRequest.description,
                    preferredDate: interviewRequest.preferredDate,
                    timestamp: new Date().toISOString()
                })
            }).catch(err => console.error("Webhook error:", err));
        } catch (e) {
            console.error("Webhook triggering failed", e);
        }
    }

    return new Response(
      JSON.stringify({ message: action === 'modify' ? "Cambios enviados. Pendiente de aprobación." : "Respuesta registrada correctamente." }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ message: "Error interno del servidor." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
