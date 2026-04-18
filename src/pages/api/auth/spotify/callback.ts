import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { exchangeSpotifyCode, getSpotifyUserInfo, generateToken, followSpotifyShow } from '../../../../lib/auth';
import User from '../../../../models/User';
import { createHash } from 'crypto';
import { calculateStreakUpdate } from '../../../../lib/streak';

const VEREDILLAS_PODCAST_ID = '6mXWyLhzhET5EHk1p72j18';

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
    const redirectUri = import.meta.env.SPOTIFY_REDIRECT_URI || `${url.origin}/api/auth/spotify/callback`;
    const accessToken = await exchangeSpotifyCode(code, redirectUri);

    // [NUEVO] Seguir automáticamente el podcast oficial de Veredillas FM
    try {
      await followSpotifyShow(accessToken, VEREDILLAS_PODCAST_ID);
    } catch (followError) {
      console.error('Error following podcast:', followError);
      // No bloqueamos el login si falla seguir el podcast
    }

    // Obtener información del usuario de Spotify
    const spotifyUser = await getSpotifyUserInfo(accessToken);

    // Spotify user image handling
    let spotifyPicture = undefined;
    if (spotifyUser.images && spotifyUser.images.length > 0) {
      spotifyPicture = spotifyUser.images[0].url;
    }

    // Helper to determine the best profile picture (Gravatar fallback)
    const getProfilePicture = async (email: string, originalPicture?: string) => {
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
      return originalPicture;
    };
    
    // Determinar imagen
    const userPicture = await getProfilePicture(spotifyUser.email, spotifyPicture);

    // Buscar o crear usuario en la base de datos
    let user = await User.findOne({ 
      $or: [
        { spotifyId: spotifyUser.id },
        { email: spotifyUser.email }
      ]
    });

    const now = new Date();

    if (!user) {
      const refCookie = cookies.get('ref')?.value;
      let referredByObjId = undefined;

      if (refCookie && mongoose.Types.ObjectId.isValid(refCookie)) {
        const referrer = await User.findById(refCookie);
        if (referrer) {
          referredByObjId = referrer._id;
        }
      }

      // Crear nuevo usuario
      user = await User.create({
        spotifyId: spotifyUser.id,
        email: spotifyUser.email,
        name: spotifyUser.display_name || spotifyUser.id,
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
          body: JSON.stringify({ name: user.name, email: user.email }),
        });
      } catch (webhookError) {
        console.error('Error sending webhook notification:', webhookError);
      }
    } else {
      // Si el usuario existe pero no tiene spotifyId, lo vinculamos
      if (!user.spotifyId || user.spotifyId !== spotifyUser.id) {
        user.spotifyId = spotifyUser.id;
      }

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
    console.error('Error in Spotify OAuth callback:', error);
    return redirect('/?auth=error');
  }
};
