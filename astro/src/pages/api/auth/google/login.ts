import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ redirect, url }) => {
  const GOOGLE_CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID;
  
  if (!GOOGLE_CLIENT_ID) {
    return new Response(JSON.stringify({ error: 'Google Client ID not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Redirect URI debe coincidir con el configurado en Google Console
  const redirectUri = import.meta.env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  
  // Construir URL de autorización de Google
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  return redirect(googleAuthUrl.toString());
};
