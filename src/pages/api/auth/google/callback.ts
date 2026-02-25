import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { exchangeGoogleCode, getGoogleUserInfo, generateToken } from '../../../../lib/auth';
import User from '../../../../models/User';
import { createHash } from 'crypto';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Si el usuario rechazó el acceso
  if (error) {
    return redirect('/?auth=cancelled');
  }

  if (!code) {
    return redirect('/?auth=error');
  }

  try {
    // Conectar a MongoDB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) {
        throw new Error('MONGODB_URI not configured');
      }
      await mongoose.connect(MONGODB_URI);
    }

    // Intercambiar el código por el access token
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const accessToken = await exchangeGoogleCode(code, redirectUri);

    // Obtener información del usuario de Google
    const googleUser = await getGoogleUserInfo(accessToken);

    // Helper to determine the best profile picture
    const getProfilePicture = async (email: string, googlePicture?: string) => {
      try {
        const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex');
        const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;
        
        // Check if user has a custom gravatar
        const response = await fetch(gravatarUrl, { method: 'HEAD' });
        
        if (response.ok) {
          return `https://www.gravatar.com/avatar/${hash}`; 
        }
      } catch (e) {
        console.warn('Failed to check Gravatar:', e);
      }
      return googlePicture;
    };
    
    // Determine picture to use
    const userPicture = await getProfilePicture(googleUser.email, googleUser.picture);

    // Buscar o crear usuario en la base de datos
    let user = await User.findOne({ googleId: googleUser.id });

    const now = new Date();
    const getDayStr = (d: Date) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();

    if (!user) {
      // Crear nuevo usuario
      user = await User.create({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: userPicture,
        lastLogin: now,
        lastActiveAt: now,
        currentStreak: 1,
        maxStreak: 1
      });
      
      // Notificar registro a n8n
      try {
        await fetch('https://n8n.broslunas.com/webhook/veredillasfm-new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: user.name, email: user.email }),
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
        // Active today but streak wasn't tracked yet
        user.currentStreak = 1;
        user.maxStreak = Math.max(user.maxStreak || 0, 1);
      }

      user.lastLogin = now;
      user.lastActiveAt = now;
      if (userPicture) {
        user.picture = userPicture;
      }
      await user.save();
    }

    // Generar JWT token
    const token = generateToken(user);

    // Establecer cookie con el token
    cookies.set('auth-token', token, {
      httpOnly: true,
      secure: import.meta.env.PROD, // Solo HTTPS en producción
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

    // Redirigir a la página de éxito para cerrar el popup
    return redirect('/auth/success');

  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return redirect('/?auth=error');
  }
};
