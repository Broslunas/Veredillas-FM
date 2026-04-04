/**
 * GET /api/auth/canariaseducacion/poll?id=<authId>
 *
 * The main tab calls this every ~1.5 s to check whether the Apps Script
 * bridge has already called /register-pending for this auth session.
 */

import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { PendingCanariasAuth } from '../../../../models/PendingCanariasAuth';

export const prerender = false;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  const uri = import.meta.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
}

export const GET: APIRoute = async ({ url }) => {
  const authId = url.searchParams.get('id');
  if (!authId) {
    return new Response(JSON.stringify({ ready: false, error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await connectDB();
    const record = await PendingCanariasAuth.exists({ authId });
    return new Response(JSON.stringify({ ready: !!record }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[CanariasAuth] poll error:', err);
    return new Response(JSON.stringify({ ready: false, error: 'DB error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
