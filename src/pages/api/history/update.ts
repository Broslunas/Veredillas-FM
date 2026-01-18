import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { verifyToken } from '../../../lib/auth';
import User from '../../../models/User';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('auth-token')?.value;
    const userPayload = token ? verifyToken(token) : null;

    if (!userPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI not configured');
      }
      await mongoose.connect(MONGODB_URI);
    }

    const body = await request.json();
    const { episodeSlug, progress, duration, completed } = body;

    if (!episodeSlug) {
      return new Response(JSON.stringify({ error: 'Episode slug is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await User.findById(userPayload.userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Remove existing entry for this episode if it exists
    const existingHistoryIndex = user.playbackHistory?.findIndex(h => h.episodeSlug === episodeSlug);
    let previousProgress = 0;
    let previousDuration = 0;
    
    if (existingHistoryIndex !== undefined && existingHistoryIndex !== -1) {
      previousProgress = user.playbackHistory[existingHistoryIndex].progress;
      previousDuration = user.playbackHistory[existingHistoryIndex].duration;
      user.playbackHistory.splice(existingHistoryIndex, 1);
    }

    // Use incoming duration if valid, otherwise fallback to previous
    const finalDuration = (typeof duration === 'number' && duration > 0 && isFinite(duration)) ? duration : previousDuration;

    // Add new entry to the beginning
    user.playbackHistory.unshift({
      episodeSlug,
      progress: progress || 0,
      duration: finalDuration || 0,
      listenedAt: new Date(),
      completed: completed || false
    });

    // Keep only the last 50 items
    if (user.playbackHistory.length > 50) {
      user.playbackHistory = user.playbackHistory.slice(0, 50);
    }

    // Update total listening time (approximate, adds difference if progress increased)
    // This is a naive implementation. A better one would track increment. 
    // For now, let's just assume the client sends the current progress.
    // If we want to track TOTAL listening time strictly, we rely on the client sending "time listened since last update" or similar.
    // However, the USER request is just "Playback history". 
    // Updating listeningTime is a side bonus. Let's just update the history for now to be safe and avoid double counting issues with simple progress updates.
    
    // Actually, let's just save the user.
    await user.save();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating history:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
