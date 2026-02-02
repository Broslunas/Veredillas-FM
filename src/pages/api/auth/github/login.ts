export const prerender = false;

export async function GET() {
  const client_id = import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID;
  const redirect_uri = 'https://www.veredillasfm.es/api/auth/github/callback';
  const scope = 'repo';

  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=${scope}&redirect_uri=${redirect_uri}`;

  return Response.redirect(url);
}
