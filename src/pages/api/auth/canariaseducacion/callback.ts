import type { APIRoute } from 'astro';
import mongoose from 'mongoose';
import { createHmac, createHash } from 'crypto';
import User from '../../../../models/User';
import { generateToken } from '../../../../lib/auth';

export const prerender = false;

const SECRET_KEY = import.meta.env.CANARIAS_EDUCACION_BRIDGE_SECRET || "vFm_Radio_2026_x9K2pQ7nLz4WvR8sB";

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
  const rawEmail = url.searchParams.get('email');
  const token = url.searchParams.get('token');

  if (!rawEmail || !token) {
    console.error('[Auth Canarian] Missing parameters:', { rawEmail, token });
    return redirect('/login?error=MissingParams');
  }

  const email = rawEmail.trim().toLowerCase();

  // 1. Validar el token con HMAC-SHA256
  // IMPORTANTE: El script de Apps Script debe haber usado el email original o el mismo formato
  // Probamos con el email tal cual vino (case sensitive) si el de arriba falla, 
  // pero lo normal es que sea el email de sesión de Google.
  
  const verifyToken = (emailToHash: string) => {
    const hmac = createHmac('sha256', SECRET_KEY);
    hmac.update(emailToHash);
    return hmac.digest('hex');
  };

  const expectedToken = verifyToken(rawEmail); // Probamos con el original primero
  const expectedTokenLower = verifyToken(email); // Probamos con lowercase por si acaso

  if (token !== expectedToken && token !== expectedTokenLower) {
    console.error('[Auth Canarian] Invalid token for email:', email, { 
        received: token, 
        expected: expectedToken,
        expectedLower: expectedTokenLower 
    });
    return redirect('/login?error=InvalidToken');
  }

  // 2. Validar dominio (doble check de seguridad)
  if (!email.endsWith('@canariaseducacion.es')) {
    return redirect('/login?error=InvalidDomain');
  }

  try {
    // Conectar a MongoDB
    if (mongoose.connection.readyState !== 1) {
      const MONGODB_URI = import.meta.env.MONGODB_URI;
      if (!MONGODB_URI) throw new Error('MONGODB_URI not configured');
      await mongoose.connect(MONGODB_URI);
    }

    // Helper to determine the best profile picture
    const getProfilePicture = async (emailAddr: string) => {
        try {
          const hash = createHash('md5').update(emailAddr.trim().toLowerCase()).digest('hex');
          const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;
          const response = await fetch(gravatarUrl, { method: 'HEAD' });
          if (response.ok) return `https://www.gravatar.com/avatar/${hash}`; 
        } catch (e) {
          console.warn('Failed to check Gravatar:', e);
        }
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(emailAddr)}&background=8b5cf6&color=fff`;
    };

    // 3. Generar un ID numérico único basado en el email para evitar conflictos en GoogleId
    // Algunos navegadores y lógica interna pueden esperar un ID numérico que no sea "edu_..."
    const hashInt = parseInt(createHash('md5').update(email).digest('hex').substring(0, 12), 16);
    const virtualGoogleId = `${hashInt}`;

    // Buscar usuario por email prioritariamente
    let user = await User.findOne({ email: email });

    const now = new Date();
    const getDayStr = (d: Date) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    const userPicture = await getProfilePicture(email);

    if (!user) {
      // Crear nuevo usuario
      const nameFromEmail = email.split('@')[0].replace(/\./g, ' ');
      const capitalizedName = nameFromEmail.split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

      user = await User.create({
        googleId: virtualGoogleId, // Evitamos el error Duplicate Key: null
        email: email,
        name: capitalizedName,
        picture: userPicture,
        lastLogin: now,
        lastActiveAt: now,
        currentStreak: 1,
        maxStreak: 1,
        role: 'user'
      });

      // Notificar registro a n8n
      try {
        await fetch('https://n8n.broslunas.com/webhook/veredillasfm-new-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: user.name, email: user.email, source: 'canariaseducacion' }),
        });
      } catch (webhookError) {
        console.error('Error sending webhook notification:', webhookError);
      }
    } else {
      // Actualizar streak logic
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
        user.maxStreak = Math.max(user.maxStreak || 0, user.currentStreak);
      }

      // Limpiar googleId si es null o problemático para evitar errores E11000
      if (!user.googleId) {
        user.googleId = virtualGoogleId;
      }
      
      user.lastLogin = now;
      user.lastActiveAt = now;
      if (!user.picture || user.picture.includes('ui-avatars')) {
          user.picture = userPicture;
      }
      await user.save();
    }

    // 4. Generar el Token y preparar respuesta
    const jwtToken = generateToken(user);
    
    // Usamos el propio callback como página de éxito para evitar pérdidas de contexto
    
    console.log('[Auth Canarian] Finalizing session on host:', url.host);

    const maxAge = 60 * 60 * 24 * 30; // 30 días
    const host = url.host;
    // Si estamos en el dominio real, compartimos la cookie entre www y apex
    const domain = host.includes('veredillasfm.es') ? '.veredillasfm.es' : undefined;

    // --- COOKIES (Native Astro API for Vercel/Prod reliability) ---
    // Astro gestionará las cabeceras Set-Cookie en el objeto Response generado al final
    cookies.set('auth-token', jwtToken, {
      path: '/',
      domain: domain,
      maxAge: maxAge,
      httpOnly: true,
      secure: true, 
      sameSite: 'lax'
    });

    cookies.set('user-session', 'true', {
      path: '/',
      domain: domain,
      maxAge: maxAge,
      httpOnly: false,
      secure: true,
      sameSite: 'lax'
    });

    const responseHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Autenticación - Veredillas FM</title>
          <script>
            // --- FRAME BREAKER CRÍTICO ---
            // Si Google Apps Script nos ha metido en un iframe, las cookies y el opener fallarán.
            // Forzamos a que la ventana entera sea de nuestro dominio.
            if (window.top !== window.self) {
                window.top.location.href = window.location.href;
            }
          </script>
          <style>
              body { background: #0a0a0a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, -apple-system, sans-serif; text-align: center; margin: 0; padding: 2rem; box-sizing: border-box; }
              .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 3rem; border-radius: 2rem; backdrop-filter: blur(20px); max-width: 400px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
              .spinner { width: 48px; height: 48px; border: 4px solid rgba(139,92,246,0.1); border-left-color: #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
              h1 { font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 800; background: linear-gradient(to right, #fff, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
              p { color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-bottom: 2rem; }
              @keyframes spin { to { transform: rotate(360deg); } }
              .btn { background: #7c3aed; color: white; border: none; padding: 1rem 2rem; border-radius: 1rem; font-weight: 800; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; box-shadow: 0 10px 20px -5px rgba(139,92,246,0.5); width: 100%; box-sizing: border-box; }
              .btn:hover { background: #8b5cf6; transform: translateY(-2px); shadow: 0 15px 25px -5px rgba(139,92,246,0.6); }
              .btn:active { transform: translateY(0); }
          </style>
      </head>
      <body>
          <div class="card">
              <div class="spinner"></div>
              <h1>¡Bienvenido, ${user.name}!</h1>
              <p>Tu sesión se ha iniciado correctamente. La ventana se cerrará sola.</p>
              <button onclick="finish()" class="btn">Confirmar y Entrar</button>
          </div>
          <script>
            // Solo ejecutamos esto si estamos en la ventana superior (fuera de iframes)
            if (window.top === window.self) {
                // Notificar al padre via localStorage (Señal universal)
                localStorage.setItem('canarian_auth_done', Date.now().toString());

                function finish() {
                  if (window.opener) {
                    try {
                      window.opener.postMessage({ type: 'auth_success' }, '*');
                      window.opener.location.href = '/dashboard';
                    } catch (e) {
                      console.warn('Opener not accessible');
                    }
                  }
                  window.close();
                  setTimeout(() => { if (!window.closed) window.location.href = '/dashboard'; }, 400);
                }

                // Automatización después de 1.5 segundos
                setTimeout(finish, 1500);
            }
          </script>
      </body>
      </html>
    `;

    return new Response(responseHTML, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    });

  } catch (error) {
    console.error('Error in Canariaseducacion auth callback:', error);
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown'}. Intenta de nuevo.`, { status: 500 });
  }
};
