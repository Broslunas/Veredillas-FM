import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { generateToken } from '../../../../lib/auth';
import User from '../../../../models/User';
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
      return new Response(JSON.stringify({ error: 'Token inválido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const calculatedHash = createHash('sha256').update(code + JWT_SECRET).digest('hex');
    if (calculatedHash !== payload.hash) {
      return new Response(JSON.stringify({ error: 'Código incorrecto' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Conectar a MongoDB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI not configured');
      }
      await mongoose.connect(MONGODB_URI);
    }

    // Buscar el usuario por email
    let user = await User.findOne({ email: payload.email });
    const now = new Date();
    const getDayStr = (d: Date) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();

    if (!user) {
      const emailUsername = payload.email.split('@')[0];
      
      // Intentar obtener avatar de Gravatar
      const avatarHash = createHash('md5').update(payload.email.trim().toLowerCase()).digest('hex');
      const userPicture = `https://www.gravatar.com/avatar/${avatarHash}?d=identicon`;

      const refCookie = cookies.get('ref')?.value;
      let referredByObjId = undefined;

      if (refCookie && mongoose.Types.ObjectId.isValid(refCookie)) {
        const referrer = await User.findById(refCookie);
        if (referrer) {
          referredByObjId = referrer._id;
        }
      }

      user = await User.create({
        email: payload.email,
        name: emailUsername,
        picture: userPicture,
        lastLogin: now,
        lastActiveAt: now,
        currentStreak: 1,
        maxStreak: 1,
        referredBy: referredByObjId
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
    } else {
      // --- STREAK LOGIC FOR LOGIN EVENT ---
      const todayStr = getDayStr(now);
      const lastActiveStr = user.lastActiveAt ? getDayStr(new Date(user.lastActiveAt)) : null;

      if (!lastActiveStr) {
        user.currentStreak = 1;
        user.maxStreak = Math.max(user.maxStreak || 0, 1);
      } else if (todayStr !== lastActiveStr) {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (lastActiveStr === getDayStr(yesterday)) {
          user.currentStreak = (user.currentStreak || 0) + 1;
        } else {
          user.currentStreak = 1;
        }
        if (user.currentStreak > (user.maxStreak || 0)) {
          user.maxStreak = user.currentStreak;
        }
      } else if (!user.currentStreak || user.currentStreak === 0) {
        user.currentStreak = 1;
        user.maxStreak = Math.max(user.maxStreak || 0, 1);
      }

      user.lastLogin = now;
      user.lastActiveAt = now;
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
    console.error('Verification code error:', error);
    return new Response(JSON.stringify({ error: 'Código expirado o inválido' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
