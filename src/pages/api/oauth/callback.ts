import type { APIContext } from 'astro';

export async function GET({ request }: APIContext) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return new Response('No code provided', { status: 400 });
  }

  // Debug payload
  console.log('Exchanging code for token...');

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
    console.log('GitHub Token Response:', data);

    if (data.error) {
       return new Response(`Error from GitHub: ${data.error_description}`, { status: 400 });
    }

    const token = data.access_token;

    // Generate SAFE script
    const content = { token, provider: 'github' };
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authenticating...</title>
      </head>
      <body>
        <p>Autenticación completada. Cerrando ventana...</p>
        <script>
          (function() {
            const data = ${JSON.stringify(content)};
            const msg = "authorization:github:success:" + JSON.stringify(data);
            
            console.log("Sending message to opener:", msg);

            function sendMessage() {
               if (window.opener) {
                  window.opener.postMessage(msg, "*");
               }
            }
            
            // Send immediately
            sendMessage();
            
            // Also listen for request from opener (handshake)
            window.addEventListener("message", function(e) {
                if (e.data === "authorizing:github") {
                    sendMessage();
                }
            });

            // Close after a short delay
            setTimeout(function() {
                 window.close();
            }, 1000);
          })();
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
