import { getCollection } from 'astro:content';
import User from '../models/User';
import { sendEmail } from './mailjet';
import mongoose from 'mongoose';
import dbConnect from './mongodb';

export async function processWeeklyNewsletter() {
  await dbConnect();
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Get all episodes
  const allEpisodes = await getCollection('episodios');
  
  // 2. Identify upcoming episodes
  const upcomingEpisodes = allEpisodes
    .filter(ep => ep.data.pubDate > now && ep.data.pubDate <= nextWeek)
    .sort((a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime());

  // 3. Get all users who want the newsletter
  const users = await User.find({ newsletter: true });

  const results = {
    totalUsers: users.length,
    sent: 0,
    errors: [] as string[]
  };

  for (const user of users) {
    try {
      // 4. Personalized Recommendation
      const userListened = new Set([...user.completedEpisodes, ...user.playbackHistory.filter(h => h.completed).map(h => h.episodeSlug)]);
      
      // Calculate user interests based on listened episodes (tags and participants)
      const interestCounts = new Map<string, number>();
      const listenedEpisodes = allEpisodes.filter(ep => userListened.has(ep.slug));
      
      for (const ep of listenedEpisodes) {
        // Collect tags
        for (const tag of (ep.data.tags || [])) {
          interestCounts.set(tag, (interestCounts.get(tag) || 0) + 1);
        }
        // Collect participants
        for (const person of (ep.data.participants || [])) {
          const key = `person:${person}`;
          interestCounts.set(key, (interestCounts.get(key) || 0) + 1);
        }
      }

      // Find candidates (not listened, already published)
      let candidates = allEpisodes.filter(ep => !userListened.has(ep.slug) && ep.data.pubDate <= now);

      let isRecap = false;
      if (candidates.length === 0) {
        // If all episodes are listened, recommend top 3 best rated/liked episodes again
        candidates = allEpisodes.filter(ep => ep.data.pubDate <= now);
        isRecap = true;
      }

      // Score candidates
      const scoredCandidates = candidates.map(ep => {
        let score = 0;
        // Score based on tags
        for (const tag of (ep.data.tags || [])) {
          score += interestCounts.get(tag) || 0;
        }
        // Score based on participants
        for (const person of (ep.data.participants || [])) {
          score += interestCounts.get(`person:${person}`) || 0;
        }
        return { ep, score };
      });

      // Pick best candidates (up to 3)
      // Sort by score (tastes), and use random tie-breaker if tastes don't differ
      scoredCandidates.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return Math.random() - 0.5; // Random for users with no specific match
      });
      const recommendations = scoredCandidates.slice(0, 3).map(c => c.ep);

      if (recommendations.length === 0) continue;

      // 5. Build HTML
      const html = generateNewsletterHtml(user, recommendations, upcomingEpisodes, isRecap);

      // 6. Send Email
      const emailResult = await sendEmail({
        to: user.email,
        toName: user.name,
        subject: isRecap 
            ? `✨ ${user.name}, hemos seleccionado lo mejor para ti en Veredillas FM` 
            : `🎙️ "${recommendations[0].data.title}" - Tu dosis semanal de Veredillas FM`,
        htmlContent: html
      });

      if (emailResult.success) {
        results.sent++;
      } else {
        results.errors.push(`Error sending to ${user.email}: ${JSON.stringify(emailResult.error)}`);
      }
    } catch (err) {
      results.errors.push(`Error processing user ${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return results;
}

function generateNewsletterHtml(user: any, recommendations: any[], upcoming: any[], isRecap: boolean) {
  const mainEp = recommendations[0];
  const others = recommendations.slice(1);
  const siteUrl = "https://veredillasfm.es";
  
  // Format listening time
  const hours = Math.floor((user.listeningTime || 0) / 3600);
  const listeningMsg = hours > 1 ? `Has escuchado más de ${hours} horas de contenido ❤️` : '¡Sigue disfrutando del mejor contenido escolar!';

  const upcomingHtml = upcoming.length > 0 
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px; border-radius:16px; background:linear-gradient(135deg, #1e1b4b, #000000); border:1px solid #4338ca; overflow:hidden;">
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 16px; font-size:12px; color:#818cf8; font-weight:700; text-transform:uppercase; letter-spacing:1px; text-align:center;">🚀 PRÓXIMOS ESTRENOS</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${upcoming.map((ep, i) => `
                <tr>
                  <td style="padding:12px 0; border-bottom:${i === upcoming.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.1)'};">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width:32px; height:32px; background:rgba(139, 92, 246, 0.2); border-radius:8px; display:inline-block; text-align:center; line-height:32px; color:#8b5cf6; font-weight:bold;">${i+1}</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0; color:#ffffff; font-size:15px; font-weight:700;">${ep.data.title}</p>
                          <p style="margin:4px 0 0; color:#a1a1aa; font-size:13px;">${ep.data.pubDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </td>
                        <td align="right" valign="middle">
                           <span style="display:inline-block; background:rgba(16, 185, 129, 0.1); border:1px solid #10b981; color:#10b981; font-size:11px; padding:2px 8px; border-radius:4px; font-weight:700;">PRÓXIMAMENTE</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
    `
    : '';

  const othersHtml = others.length > 0 
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
        <tr>
          <td style="padding-bottom:16px;">
            <p style="margin:0; font-size:12px; color:#8b5cf6; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">TAMBIÉN TE PUEDEN GUSTAR</p>
          </td>
        </tr>
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${others.map(ep => `
                <tr>
                  <td style="padding:16px; margin-bottom:12px; background:#121212; border:1px solid #2d2d2d; border-radius:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="80" valign="top">
                          <a href="${siteUrl}/ep/${ep.slug}">
                            <img src="${ep.data.image || siteUrl + '/logo.png'}" width="70" height="70" style="border-radius:10px; object-fit:cover; display:block; border:1px solid #333;">
                          </a>
                        </td>
                        <td style="padding-left:16px;" valign="top">
                          <p style="margin:0; font-size:16px; font-weight:700; color:#ffffff;">${ep.data.title}</p>
                          <p style="margin:4px 0 12px; font-size:13px; color:#a1a1aa; line-height:1.4;">${ep.data.description.substring(0, 90)}...</p>
                          <a href="${siteUrl}/ep/${ep.slug}" style="color:#8b5cf6; font-size:13px; font-weight:700; text-transform:uppercase;">Escuchar ahora →</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="12"></td></tr>
              `).join('')}
            </table>
          </td>
        </tr>
      </table>
    `
    : '';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${isRecap ? 'Lo mejor para ti' : 'Nuevo Episodio'} - Veredillas FM</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');
    .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; }
    a { text-decoration:none; transition: all 0.2s; }
    a:hover { opacity: 0.8; }
    body { margin:0; padding:0; background:#000000; font-family:'Inter', Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; }
    @media (max-width:620px){
      .container { width:100%!important; }
      .p-24 { padding:16px!important; }
      .btn { display:block!important; width:100%!important; text-align: center; box-sizing: border-box; }
      .hero-image { height: auto !important; width: 100% !important; }
      .stats-table { border-spacing: 0 8px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#000000;">
  <div class="preheader">🎙️ ${isRecap ? 'Recordamos lo mejor:' : '¡Especial para ti! Escucha:'} "${mainEp.data.title}" en Veredillas FM.</div>
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000000;">
    <tr>
      <td align="center" style="padding:24px;">
        <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px; max-width:600px; background:#0a0a0a; border-radius:24px; overflow:hidden; border: 1px solid #2d2d2d; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
          
          <!-- Header with Gradient Background -->
          <tr style="background: linear-gradient(180deg, #1e1e2d 0%, #0a0a0a 100%);">
            <td align="center" style="padding:40px 32px 24px;">
              <a href="${siteUrl}" target="_blank">
                <img src="${siteUrl}/logo.png" width="90" height="90" alt="Veredillas FM" style="display:block; border:0; border-radius:18px; box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);">
              </a>
              <div style="margin:24px 0 0; display:inline-block; background:${isRecap ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; padding:6px 16px; border-radius:24px; border:1px solid ${isRecap ? '#8b5cf6' : '#10b981'};">
                <p style="margin:0; font-size:12px; color:${isRecap ? '#a78bfa' : '#34d399'}; font-weight:800; text-transform:uppercase; letter-spacing:2px;">${isRecap ? '🔥 Vuelve a escucharlos' : '✨ Selección Personalizada'}</p>
              </div>
              <h1 style="margin:20px 0 0; font-size:32px; line-height:1.2; color:#ffffff; font-weight: 800; letter-spacing: -1px;">
                Especial para tí, <span style="color:#8b5cf6;">${user.name}</span>
              </h1>
              <p style="margin:12px 0 0; font-size:15px; color:#a1a1aa; font-weight:400; line-height:1.5;">
                ${listeningMsg}
              </p>
            </td>
          </tr>

          <!-- Main Recommendation -->
          <tr>
            <td class="p-24" style="padding:32px;">
              
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#121212; border-radius:20px; border:1px solid #333; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <tr>
                  <td style="padding:0;">
                    <a href="${siteUrl}/ep/${mainEp.slug}">
                      <img src="${mainEp.data.image || siteUrl + '/logo.png'}" alt="${mainEp.data.title}" class="hero-image" style="width:100%; height:auto; display:block;">
                    </a>
                    
                    <div style="padding:32px;">
                      <p style="margin:0 0 8px; font-size:12px; color:#8b5cf6; font-weight:700; text-transform:uppercase; letter-spacing:1px;">RECOMENDACIÓN DESTACADA</p>
                      <h2 style="margin:0 0 16px; font-size:24px; color:#ffffff; font-weight:800;">${mainEp.data.title}</h2>
                      <p style="margin:0 0 24px; font-size:16px; line-height:1.6; color:#a1a1aa;">
                        ${mainEp.data.description.substring(0, 220)}...
                      </p>
                      
                      <!-- Action Buttons -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="left">
                            <a href="${siteUrl}/ep/${mainEp.slug}" class="btn" 
                               style="background:#8b5cf6; color:#ffffff; padding:16px 32px; border-radius:12px; font-weight:700; font-size:16px; display:inline-block; text-align:center; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">
                              Reproducir ahora 🎧
                            </a>
                          </td>
                          <td style="padding-left:12px;">
                            ${mainEp.data.spotifyUrl ? `
                                <a href="${mainEp.data.spotifyUrl}" target="_blank" style="display:inline-block; padding:16px; background:#1db954; border-radius:12px; box-shadow: 0 4px 15px rgba(29, 185, 84, 0.3);">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg" width="24" height="24" alt="Spotify">
                                </a>
                            ` : ''}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              ${othersHtml}

              <!-- Short Action Links -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px; background:rgba(255,255,255,0.03); border-radius:12px; padding:16px;">
                 <tr>
                    <td align="center">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td align="center" style="padding:0 8px;">
                                    <a href="${siteUrl}/perfil" style="color:#ffffff; font-size:13px; font-weight:700;">👤 Mi Perfil</a>
                                </td>
                                <td width="1" style="background:rgba(255,255,255,0.1);"></td>
                                <td align="center" style="padding:0 8px;">
                                    <a href="${siteUrl}/stats" style="color:#ffffff; font-size:13px; font-weight:700;">📊 Estadísticas</a>
                                </td>
                                <td width="1" style="background:rgba(255,255,255,0.1);"></td>
                                <td align="center" style="padding:0 8px;">
                                    <a href="${siteUrl}/ep" style="color:#ffffff; font-size:13px; font-weight:700;">📻 Catálogo</a>
                                </td>
                            </tr>
                        </table>
                    </td>
                 </tr>
              </table>

              ${upcomingHtml}

              <!-- Socials & Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:40px; border-top:1px solid #2d2d2d; padding-top:40px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 20px; font-size:14px; font-weight:700; color:#8b5cf6; text-transform:uppercase; letter-spacing:1px;">CONÉCTATE CON NOSOTROS</p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:0 12px;">
                          <a href="https://www.instagram.com/veredillasfm.es/" target="_blank" style="color:#ffffff;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" width="24" height="24" alt="Instagram">
                          </a>
                        </td>
                        <td style="padding:0 12px;">
                          <a href="https://veredillasfm.es" target="_blank" style="color:#ffffff;">
                            <img src="${siteUrl}/logo.png" width="24" height="24" alt="Web">
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin:30px 0 10px; font-size: 11px; color: #52525b; letter-spacing: 0.5px; font-weight:700;">© 2026 VEREDILLAS FM | LA VOZ DEL IES VEREDILLAS</p>
                    <div style="margin-top: 20px;">
                      <a href="${siteUrl}" style="color:#71717a; font-size:12px; margin:0 12px; text-decoration: underline;">Web Oficial</a>
                      <span style="color:#2d2d2d;">•</span>
                      <a href="${siteUrl}/perfil" style="color:#71717a; font-size:12px; margin:0 12px; text-decoration: underline;">Preferencias</a>
                      <span style="color:#2d2d2d;">•</span>
                      <a href="[[UNSUB_LINK_ES]]" style="color:#71717a; font-size:12px; margin:0 12px; text-decoration: underline;">Dejar de recibir</a>
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
