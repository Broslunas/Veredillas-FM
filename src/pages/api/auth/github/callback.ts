export const prerender = false;

import { serialize } from 'cookie';

export async function GET({ request }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('No code provided', { status: 400 });
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID,
        client_secret: import.meta.env.KEYSTATIC_GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();

    if (data.error) {
       return new Response(`Error from GitHub: ${data.error_description}`, { status: 400 });
    }

    const token = data.access_token;

    // Set cookie
    const cookie = serialize('cms_gh_token', token, {
        httpOnly: true,
        secure: import.meta.env.PROD,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: 'lax'
    });

    return new Response(null, {
      status: 302,
      headers: {
        'Set-Cookie': cookie,
        'Location': '/dashboard/admin/cms'
      }
    });

  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
