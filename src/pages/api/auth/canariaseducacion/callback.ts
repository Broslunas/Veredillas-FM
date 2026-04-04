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

    // 4. Generar el JWT Token y la respuesta HTML
    const jwtToken = generateToken(user);
    
    // Usamos el propio callback como página de éxito para evitar pérdidas de contexto por saltos 302
    
    console.log('[Auth Canarian] Finalizing session on host:', url.host);

    const maxAge = 60 * 60 * 24 * 30; // 30 días
    
    // --- COOKIES (Native Astro API for Vercel/Prod reliability) ---
    // Usamos Astro.cookies.set para que el motor de Astro gestione las cabeceras correctamente
    cookies.set('auth-token', jwtToken, {
      path: '/',
      maxAge: maxAge,
      httpOnly: true,
      secure: true, // Producción siempre es HTTPS
      sameSite: 'lax'
    });

    cookies.set('user-session', 'true', {
      path: '/',
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
          <title>Autenticación Exitosa - Veredillas FM</title>
          <style>
              body { background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; text-align: center; margin: 0; }
              .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-left-color: #8b5cf6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1.5rem; }
              @keyframes spin { to { transform: rotate(360deg); } }
          </style>
      </head>
      <body>
          <div>
              <div class="spinner"></div>
              <h1>¡Bienvenido, ${user.name}!</h1>
              <p>Sesión confirmada. Redirigiendo...</p>
          </div>
          <script>
            // Notificar al padre via localStorage (Señal universal)
            localStorage.setItem('canarian_auth_done', Date.now().toString());

            // Intentar postMessage por si el opener sigue vivo
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'auth_success' }, '*');
              }
            } catch (e) {
              console.warn('Opener not accessible');
            }

            // Cierre incondicional después de saludar
            setTimeout(() => window.close(), 1000);
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
