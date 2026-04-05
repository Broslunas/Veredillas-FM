import type { APIRoute } from 'astro';
import WrappedSettings from '../../../models/WrappedSettings';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { getUserFromCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const cookieHeader = request.headers.get('cookie');
    const userPayload = getUserFromCookie(cookieHeader);
    
    if (!userPayload) return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
    
    await dbConnect();
    const currentUser = await User.findById(userPayload.userId);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
    }

    const { isActive, year } = await request.json();
    
    let settings = await WrappedSettings.findOne();
    if (settings) {
      settings.isActive = isActive;
      settings.year = year;
      await settings.save();
    } else {
      await WrappedSettings.create({
        isActive,
        year
      });
    }

    return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating wrapped settings:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error' }), { status: 500 });
  }
};
