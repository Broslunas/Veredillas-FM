import type { APIRoute } from 'astro';
import dbConnect from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { generateToken } from '@/lib/auth';
import User from '@/models/User';
import { calculateStreakUpdate } from '@/lib/streak';
import { createHash } from 'crypto';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const data = await request.formData();
    const token = data.get('token')?.toString();
    const code = data.get('code')?.toString()?.trim();

    if (!token || !code) {
      return new Response(JSON.stringify({ error: 'Código y token requeridos' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = jwt.verify(token, JWT_SECRET) as { email: string, hash: string, type: string };

    if (payload.type !== 'otp' || !payload.email || !payload.hash) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const calculatedHash = createHash('sha256').update(code + JWT_SECRET).digest('hex');
    if (calculatedHash !== payload.hash) {
      return new Response(JSON.stringify({ error: 'El código introducido es incorrecto' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conectar a MongoDB
    await dbConnect();

    // Buscar el usuario por email
    let user = await User.findOne({ email: payload.email });
    const now = new Date();

    if (!user) {
      // PROCESO DE REGISTRO
      try {
        const emailUsername = payload.email.split('@')[0];
        
        // Intentar obtener avatar de Gravatar
        const avatarHash = createHash('md5').update(payload.email.trim().toLowerCase()).digest('hex');
        const userPicture = `https://www.gravatar.com/avatar/${avatarHash}?d=identicon`;

        const refCookie = cookies.get('ref')?.value;
        let referredByObjId = undefined;

        if (refCookie && (typeof refCookie === 'string') && refCookie.length === 24) {
          referredByObjId = refCookie;
        }

        user = await User.create({
          email: payload.email,
          name: emailUsername,
          picture: userPicture,
          lastLogin: now,
          lastActiveAt: now,
          currentStreak: 1,
          maxStreak: 1,
          referredBy: referredByObjId,
          googleId: undefined,
          spotifyId: undefined
        });

        if (referredByObjId) {
           await User.updateOne(
             { _id: referredByObjId },
             { $push: { referrals: user._id } }
           );
        }

        // Notificar registro a n8n
        try {
          await fetch('https://n8n.broslunas.com/webhook/veredillasfm-new-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: user.name, email: user.email, via: 'verification_code' }),
          });
        } catch (webhookError) {
          console.error('Error sending webhook notification:', webhookError);
        }
      } catch (registrationError: any) {
        console.error('Registration error:', registrationError);
        return new Response(JSON.stringify({ error: 'Error al crear la cuenta. Por favor, contacta con soporte.' }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // PROCESO DE INICIO DE SESIÓN
      // --- STREAK LOGIC FOR LOGIN EVENT ---
      const { currentStreak, maxStreak, lastActiveAt, updated } = calculateStreakUpdate(
        user.lastActiveAt,
        user.currentStreak,
        user.maxStreak
      );

      if (updated) {
        user.currentStreak = currentStreak;
        user.maxStreak = maxStreak;
        user.lastActiveAt = lastActiveAt;
      }
      
      user.lastLogin = now;
      await user.save();
    }

    // Generar JWT token
    const authToken = generateToken(user);

    // Establecer cookie con el token
    cookies.set('auth-token', authToken, {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: '/'
    });
    
    // Set a client-readable cookie to flag session state
    cookies.set('user-session', 'true', {
      httpOnly: false,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Verification code main error:', error);
    return new Response(JSON.stringify({ error: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

