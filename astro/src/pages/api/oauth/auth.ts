export const prerender = false;

// Redirect to GitHub for authorization
export async function GET() {
  const client_id = import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID;
  const scope = 'repo,user';
  const redirect_uri = 'https://www.veredillasfm.es/api/oauth/callback';

  // State checks for security (optional but recommended)
  const state = Math.random().toString(36).substring(7);

  const url = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=${scope}&redirect_uri=${redirect_uri}&state=${state}`;

  return Response.redirect(url);
}
