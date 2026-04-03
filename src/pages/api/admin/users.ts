
import type { APIRoute } from 'astro';
import dbConnect from '../../../lib/mongodb';
import { getUserFromCookie } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // 1. Authenticate User
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Connect to DB
    await dbConnect();

    // 3. Verify Admin/Owner Role
    const currentUser = await User.findById(userPayload.userId);
    
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Fetch All Users
    const users = await User.find({})
      .select('-__v')
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify({ 
      success: true,
      users: users
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    // 1. Authenticate & Authorize
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { userId, name, email, role, bio, newsletter, listeningTime, currentStreak, maxStreak, favorites } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    // Check target user rights
    const userBefore = await User.findById(userId);
    if (!userBefore) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Admin cannot modify other admins or owners
    if (currentUser.role === 'admin' && (userBefore.role === 'admin' || userBefore.role === 'owner')) {
         // Exception: Admin can edit themselves? usually yes, but let's stick to "cannot modify other admins"
         if (currentUser._id.toString() !== userBefore._id.toString()) {
             return new Response(JSON.stringify({ error: 'Admins cannot modify other admins or owners' }), { status: 403 });
         }
    }

    // 3. Update User
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role; 
    if (bio !== undefined) updateData.bio = bio;
    if (newsletter !== undefined) updateData.newsletter = newsletter;
    if (listeningTime !== undefined) updateData.listeningTime = listeningTime;
    if (currentStreak !== undefined) updateData.currentStreak = currentStreak;
    if (maxStreak !== undefined) updateData.maxStreak = maxStreak;
    if (favorites && Array.isArray(favorites)) updateData.favorites = favorites;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-__v');

    if (!updatedUser) {
        return new Response(JSON.stringify({ error: 'User update failed' }), { status: 404 });
    }

    // 4. Trigger Webhook if newsletter changed
    if (newsletter !== undefined && userBefore && userBefore.newsletter !== newsletter) {
        const action = Boolean(newsletter) ? 'subscribe' : 'unsubscribe';
        try {
            await fetch('https://n8n.broslunas.com/webhook/veredillasfm-unsub-resub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: updatedUser.name,
                    email: updatedUser.email,
                    action: action
                })
            });
        } catch (webhookError) {
            console.error('Webhook trigger failed:', webhookError);
            // Don't fail the request just because webhook failed
        }
    }

    return new Response(JSON.stringify({ success: true, user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    // 1. Authenticate & Authorize
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Prevent deleting yourself
    if (userId === userPayload.userId) {
        return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { status: 400 });
    }

    // Admin cannot delete admins or owners
    if (currentUser.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'owner')) {
        return new Response(JSON.stringify({ error: 'Admins cannot delete other admins or owners' }), { status: 403 });
    }

    // 3. Delete User
    await User.findByIdAndDelete(userId);

    return new Response(JSON.stringify({ success: true, message: 'User deleted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
