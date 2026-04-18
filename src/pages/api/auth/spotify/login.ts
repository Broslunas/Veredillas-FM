import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ redirect, url }) => {
  const SPOTIFY_CLIENT_ID = import.meta.env.SPOTIFY_CLIENT_ID;
  
  if (!SPOTIFY_CLIENT_ID) {
    return new Response(JSON.stringify({ error: 'Spotify Client ID not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Redirect URI debe coincidir con el configurado en Spotify Developer Dashboard
  const redirectUri = import.meta.env.SPOTIFY_REDIRECT_URI || `${url.origin}/api/auth/spotify/callback`;
  
  // Construir URL de autorización de Spotify
  const spotifyAuthUrl = new URL('https://accounts.spotify.com/authorize');
  spotifyAuthUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  spotifyAuthUrl.searchParams.set('redirect_uri', redirectUri);
  spotifyAuthUrl.searchParams.set('response_type', 'code');
  spotifyAuthUrl.searchParams.set('scope', 'user-read-private user-read-email');
  spotifyAuthUrl.searchParams.set('show_dialog', 'true');

  return redirect(spotifyAuthUrl.toString());
};
