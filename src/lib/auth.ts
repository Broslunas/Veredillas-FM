import jwt from 'jsonwebtoken';
import type { IUser } from '@/models/User';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: IUser): string {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d' // Token válido por 30 días
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract user from request cookies
 */
export function getUserFromCookie(cookieHeader: string | null): JWTPayload | null {
  if (!cookieHeader) return null;

  const cookies = parseCookies(cookieHeader);
  const token = cookies['auth-token'];

  if (!token) return null;

  return verifyToken(token);
}

/**
 * Parse cookie header string into object
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split('=');
    cookies[name] = decodeURIComponent(value);
    return cookies;
  }, {} as Record<string, string>);
}

/**
 * Exchange Google OAuth code for user info
 */
export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: import.meta.env.GOOGLE_CLIENT_ID || '',
      client_secret: import.meta.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get Google user info from access token
 */
export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return await response.json();
}

/**
 * Exchange Spotify OAuth code for user info
 */
export async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from((import.meta.env.SPOTIFY_CLIENT_ID || '') + ':' + (import.meta.env.SPOTIFY_CLIENT_SECRET || '')).toString('base64')
    },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Spotify token exchange error:', errorData);
    throw new Error('Failed to exchange code for token');
  }

  return await response.json();
}

/**
 * Refresh Spotify access token using refresh token
 */
export async function refreshSpotifyToken(refreshToken: string) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from((import.meta.env.SPOTIFY_CLIENT_ID || '') + ':' + (import.meta.env.SPOTIFY_CLIENT_SECRET || '')).toString('base64')
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Spotify token refresh error:', errorData);
    throw new Error('Failed to refresh Spotify token');
  }

  return await response.json();
}

/**
 * Get Spotify user info from access token
 */
export async function getSpotifyUserInfo(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info from Spotify');
  }

  return await response.json();
}

/**
 * Follow a Spotify show (podcast)
 */
export async function followSpotifyShow(accessToken: string, showId: string) {
  const response = await fetch(`https://api.spotify.com/v1/me/shows?ids=${showId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Failed to follow show ${showId}:`, errorBody);
    return false;
  }

  return true;
}

/**
 * Normaliza un título para compararlo con un slug
 */
function normalizeForSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Sincroniza episodios escuchados en Spotify con el historial local
 */
export async function syncSpotifyEpisodes(userId: string) {
  try {
    // 1. Conectar a la DB si es necesario
    const mongoose = (await import('mongoose')).default;
    const User = (await import('@/models/User')).default;

    const user = await User.findById(userId);
    if (!user || !user.spotifyId || !user.spotifyRefreshToken) return;

    // Solo sincronizar una vez cada 15 minutos para no saturar la API
    const now = new Date();
    const lastSync = user.lastSpotifySync || new Date(0);
    const fifteenMinutesInMs = 15 * 60 * 1000;
    
    if (now.getTime() - lastSync.getTime() < fifteenMinutesInMs) {
      return;
    }

    let accessToken = user.spotifyAccessToken;
    let tokensUpdated = false;

    // 2. Verificar si el token ha expirado o no existe
    if (!accessToken || !user.spotifyTokenExpiresAt || now >= user.spotifyTokenExpiresAt) {
      console.log(`Refreshing Spotify token for user ${userId}...`);
      try {
        const tokenData = await refreshSpotifyToken(user.spotifyRefreshToken);
        accessToken = tokenData.access_token;
        user.spotifyAccessToken = accessToken;
        // Spotify tokens suelen durar 1 hora (3600s)
        user.spotifyTokenExpiresAt = new Date(now.getTime() + (tokenData.expires_in || 3600) * 1000);
        
        // Si Spotify devuelve un nuevo refresh token, lo actualizamos
        if (tokenData.refresh_token) {
          user.spotifyRefreshToken = tokenData.refresh_token;
        }
        tokensUpdated = true;
      } catch (refreshError) {
        console.error('Could not refresh Spotify token:', refreshError);
        return; // No podemos sincronizar sin un token válido
      }
    }

    if (!accessToken) return;

    // 3. Obtener episodios guardados del usuario en Spotify
    const response = await fetch('https://api.spotify.com/v1/me/episodes?limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Token inválido a pesar de nuestro chequeo, podríamos intentar limpiar el token aquí
            user.spotifyAccessToken = undefined;
            await user.save();
        }
        return;
    }
    const data = await response.json();
    
    // Filtrar solo los episodios que pertenecen a nuestro podcast
    const VEREDILLAS_SHOW_ID = '6mXWyLhzhET5EHk1p72j18';
    const showEpisodes = data.items.filter((item: any) => item.episode.show.id === VEREDILLAS_SHOW_ID);

    let profileUpdated = false;

    for (const item of showEpisodes) {
      const spEpisode = item.episode;
      const title = spEpisode.name;
      const spotifyProgress = Math.floor(spEpisode.resume_point.resume_position_ms / 1000);
      const spotifyDuration = Math.floor(spEpisode.duration_ms / 1000);
      const isCompleted = spEpisode.resume_point.fully_played || (spotifyDuration > 0 && spotifyProgress >= spotifyDuration * 0.9);

      // Intentar encontrar el slug localmente por título (normalizado)
      const slug = normalizeForSlug(title.split('ft.')[0].trim());

      // Buscar si ya tiene historial de este episodio
      const historyIdx = user.playbackHistory.findIndex((h: any) => h.episodeSlug === slug);
      const localHistory = historyIdx !== -1 ? user.playbackHistory[historyIdx] : null;

      const localProgress = localHistory ? localHistory.progress : 0;
      const localCompleted = localHistory ? localHistory.completed : (user.completedEpisodes || []).includes(slug);

      // Si Spotify tiene más progreso del que tenemos nosotros
      if (spotifyProgress > localProgress || (isCompleted && !localCompleted)) {
        const delta = Math.max(0, spotifyProgress - localProgress);
        
        // Actualizar tiempo total de escucha
        user.listeningTime = (user.listeningTime || 0) + delta;

        // Actualizar o añadir al historial (usando un objeto plano para evitar problemas de tipos de mongoose)
        const newHistoryEntry = {
          episodeSlug: slug,
          progress: spotifyProgress,
          duration: spotifyDuration,
          listenedAt: new Date(),
          completed: isCompleted || localCompleted
        };

        if (historyIdx !== -1) {
          user.playbackHistory[historyIdx] = newHistoryEntry;
        } else {
          user.playbackHistory.unshift(newHistoryEntry);
        }

        // Si se ha completado, añadir a la lista permanente
        if (isCompleted && !(user.completedEpisodes || []).includes(slug)) {
          user.completedEpisodes.push(slug);
        }

        profileUpdated = true;
      }
    }

    if (profileUpdated || tokensUpdated) {
      // Limitar historial a 100
      if (user.playbackHistory.length > 100) {
        user.playbackHistory = user.playbackHistory.slice(0, 100);
      }
      user.lastActiveAt = new Date();
      user.lastSpotifySync = new Date();
      await user.save();
      console.log(`Synced Spotify history for user ${userId} (Updated: ${profileUpdated}, Tokens: ${tokensUpdated})`);
    } else {
      // Incluso si no hay cambios, actualizamos la fecha del último intento exitoso de sync
      user.lastSpotifySync = new Date();
      await user.save();
    }

  } catch (error) {
    console.error('Error syncing Spotify episodes:', error);
  }
}

