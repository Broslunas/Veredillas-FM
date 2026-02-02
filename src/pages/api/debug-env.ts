export const prerender = false;

export async function GET() {
  const hasClientId = !!import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID;
  const hasClientSecret = !!import.meta.env.KEYSTATIC_GITHUB_CLIENT_SECRET;
  const hasSecret = !!import.meta.env.KEYSTATIC_SECRET;
  
  const secret = import.meta.env.KEYSTATIC_GITHUB_CLIENT_SECRET || '';
  const clientSecretStart = secret.length > 5 ? secret.substring(0, 5) + '...' : (secret ? 'SHORT' : 'MISSING');

  return new Response(JSON.stringify({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
       KEYSTATIC_GITHUB_CLIENT_ID: hasClientId ? 'PRESENT' : 'MISSING',
       KEYSTATIC_GITHUB_CLIENT_SECRET: hasClientSecret ? `PRESENT (${clientSecretStart})` : 'MISSING',
       KEYSTATIC_SECRET: hasSecret ? 'PRESENT' : 'MISSING'
    },
    site: import.meta.env.SITE,
    prod: import.meta.env.PROD,
    base: import.meta.env.BASE_URL
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
