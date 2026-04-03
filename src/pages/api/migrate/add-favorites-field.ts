import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import User from '../../../models/User';

export const prerender = false;

/**
 * Endpoint de migración para agregar el campo favorites a usuarios existentes
 * Solo debe ejecutarse una vez. Después puedes eliminarlo.
 * Accede a: /api/migrate/add-favorites-field
 */
export const GET: APIRoute = async () => {
  try {
    // Conectar a MongoDB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI not configured');
      }
      await mongoose.connect(MONGODB_URI);
    }

    // Actualizar todos los usuarios que no tienen el campo favorites
    const result = await User.updateMany(
      { favorites: { $exists: false } },
      { $set: { favorites: [] } }
    );

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Migration completed',
      usersUpdated: result.modifiedCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
