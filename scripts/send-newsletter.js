import Mailjet from 'node-mailjet';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { glob } from 'glob';

dotenv.config();

const MAILJET_API_KEY = process.env.MJ_APIKEY_PUBLIC;
const MAILJET_API_SECRET = process.env.MJ_API_SECRET;
const CONTACT_LIST_ID = process.env.MJ_CONTACT_LIST_ID;
const CONTACT_EMAIL = 'newsletter@veredillasfm.es'; // Fallback sender
const SENDER_NAME = 'Veredillas FM';
const SITE_URL = 'https://veredillasfm.es'; // Updated URL

const HISTORY_FILE = path.join(process.cwd(), 'data', 'newsletter-history.json');
const BLOG_DIR = path.join(process.cwd(), 'src', 'content', 'blog');
const EPISODES_DIR = path.join(process.cwd(), 'src', 'content', 'episodios');

// Init Mailjet only if keys are present
let mailjet;
if (MAILJET_API_KEY && MAILJET_API_SECRET && CONTACT_LIST_ID) {
  mailjet = Mailjet.apiConnect(MAILJET_API_KEY, MAILJET_API_SECRET);
} else {
  console.warn('⚠️  Mailjet configuration missing. Running in "Dry Run" mode (only updating history).');
}

// Ensure data directory exists
if (!fs.existsSync(path.dirname(HISTORY_FILE))) {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
}

// Function to parse frontmatter
function parseFrontmatter(content) {
  const match = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!match) return null;
  
  const frontmatter = {};
  const lines = match[1].split(/[\r\n]+/);
  
  lines.forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      let value = valueParts.join(':').trim();
      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      // Simple date parsing if needed, but strings are fine for now
      frontmatter[key.trim()] = value;
    }
  });
  
  return frontmatter;
}

// Get clean text excerpt
function getExcerpt(content) {
  const contentMatch = content.match(/^---[\r\n]+[\s\S]*?[\r\n]+---[\r\n]+([\s\S]*)/);
  if (!contentMatch || !contentMatch[1]) return '';
  
  const plainText = contentMatch[1]
    .replace(/^#+\s+/gm, '') // Remove headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .replace(/^[-*+]\s+/gm, '') // Remove list markers
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
    
  return plainText.substring(0, 300) + (plainText.length > 300 ? '...' : '');
}

async function sendNewsletter(item) {
  if (!mailjet) return false;

  try {
    const { title, description, image, slug, type, url, pubDate } = item;
    
    const isFuture = pubDate && new Date(pubDate) > new Date();
    let typeLabel = type === 'episode' ? 'Nuevo Episodio' : 'Nuevo Artículo';
    if (isFuture) typeLabel = '🚀 Próximo Estreno';

    const subject = `${typeLabel}: ${title}`;
    
    const formattedDate = pubDate ? new Date(pubDate).toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    console.log(`🚀 Sending newsletter for: "${title}" (${slug}) [Future: ${isFuture}]`);



    // 1. Create Campaign Draft
    const payload = {
      "Locale": "es_ES",
      "Sender": SENDER_NAME,
      "SenderEmail": CONTACT_EMAIL,
      "Subject": subject,
      "ContactsListID": parseInt(CONTACT_LIST_ID),
      "Title": `Newsletter: ${title}` // Internal Mailjet name
    };
    
    console.log('Debug Payload:', JSON.stringify(payload, null, 2));

    const draftResponse = await mailjet.post("campaigndraft", { 'version': 'v3' }).request(payload);
    
    const draftID = draftResponse.body.Data[0].ID;
    
    // 2. Prepare Template Content
    // Note: In production you might want to use MJML or a saved template ID
    const htmlContent = `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${typeLabel} - Veredillas FM</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    .preheader { display:none!important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; }
    a { text-decoration:none; }
    body { margin:0; padding:0; background:#0b0f1a; font-family:'Inter', Arial, Helvetica, sans-serif; }
    .break-link { word-break: break-all; word-wrap: break-word; }
    @media (max-width:620px){
      .container { width:100%!important; }
      .p-24 { padding:16px!important; }
      .btn { display:block!important; width:100%!important; text-align: center; box-sizing: border-box; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#0b0f1a;">
  <div class="preheader">${description}</div>
  
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0b0f1a;">
    <tr>
      <td align="center" style="padding:24px;">
        <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px; max-width:600px; background:#0f172a; border-radius:16px; overflow:hidden; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          
          <tr>
            <td align="center" style="padding:32px 24px 8px;">
              <a href="https://veredillasfm.es" target="_blank">
                <img src="https://veredillasfm.es/logo.png" width="128" height="128" alt="Veredillas FM" style="display:block; border:0; border-radius:12px;">
              </a>
              <h1 style="margin:24px 0 0; font-size:24px; line-height:1.3; color:#ffffff; font-weight: 700;">
                ${title}
              </h1>
              <p style="margin:12px 0 0; font-size:15px; color:#94a3b8; line-height:1.5;">
                 ${isFuture ? '📅 ¡Reserva la fecha para el estreno!' : (type === 'episode' ? '🎙️ ¡Nuevo episodio disponible!' : '📝 Nuevo artículo publicado')}
              </p>
            </td>
          </tr>

          <tr>
            <td class="p-24" style="padding:24px;">
              
              <!-- Content Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#1e293b; border-radius:12px; border:1px solid #334155; overflow:hidden;">
                <tr>
                  <td style="padding:0;">
                    ${image ? `<img src="${image}" alt="${title}" style="width:100%; height:auto; display:block; border-bottom:1px solid #334155;">` : ''}
                    <div style="padding:20px;">
                      
                      ${isFuture ? `
                      <div style="background: rgba(16, 185, 129, 0.1); border: 1px dashed #10b981; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
                         <p style="color: #34d399; font-size: 12px; text-transform: uppercase; font-weight: bold; margin: 0 0 8px;">Estreno Oficial</p>
                         <p style="color: #ffffff; font-size: 18px; margin: 0;">${formattedDate}</p>
                      </div>
                      ` : ''}

                      <p style="margin:0; font-size:15px; line-height:1.6; color:#cbd5e1;">
                        ${description}
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:32px auto;">
                <tr>
                  <td align="center">
                    <a href="${url}" class="btn" 
                       style="background:#10b981; color:#ffffff; padding:16px 32px; border-radius:12px; font-weight:600; font-size:16px; display:inline-block; text-align:center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                      ${isFuture ? '🔔 Ver Cuenta Atrás en Vivo' : (type === 'episode' ? 'Escuchar Ahora' : 'Leer Artículo')}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px; border-top:1px solid #1e293b; padding-top:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px; font-size:13px; color:#34d399; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Sobre Veredillas FM:</p>
                    <p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.6;">
                      Somos la radio oficial del IES Veredillas. Un espacio creado por y para estudiantes.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:32px;">
                <tr>
                  <td align="center">
                    <p style="margin:0; font-size: 12px; color: #475569;">© ${new Date().getFullYear()} Veredillas FM. Todos los derechos reservados.</p>
                    <div style="margin-top: 12px;">
                      <a href="https://veredillasfm.es" style="color:#64748b; font-size:12px; margin:0 12px;">Web Oficial</a>
                      <a href="[[UNSUB_LINK_ES]]" style="color:#64748b; font-size:12px; margin:0 12px;">Darse de baja</a>
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
</html>
    `;
    
    // 3. Set Content
    await mailjet.post("campaigndraft", { 'version': 'v3' }).id(draftID).action("detailcontent").request({
      "Html-part": htmlContent,
      "Text-part": `${title}\n\n${description}\n\n${isFuture ? `Estreno: ${formattedDate}` : ''}\n\nVer aquí: ${url}`
    });
    
    // 4. Send
    await mailjet.post("campaigndraft", { 'version': 'v3' }).id(draftID).action("send").request();
    
    console.log(`✅ Newsletter sent successfully for: ${title} (${isFuture ? 'Premiere' : 'Instant'})`);
    return true;

  } catch (error) {
    console.error(`❌ Error sending newsletter for ${item.slug}:`, error.statusCode || error.message);
    console.error('Mailjet Error Message:', error.ErrorMessage);
    console.error('Mailjet Message:', error.message);
    if (error.response) {
       console.error('Response keys:', Object.keys(error.response));
    }
    return false;
  }
}

async function scanDirectory(directory, type, baseUrlPrefix) {
  const files = glob.sync(path.join(directory, '**/*.md').replace(/\\/g, '/'));
  const items = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    
    if (!frontmatter) continue;

    const { title, description, image, slug: frontmatterSlug } = frontmatter;
    const filenameSlug = path.basename(file, '.md');
    const slug = frontmatterSlug || filenameSlug;
    
    // Construct full URL
    const url = `${SITE_URL}${baseUrlPrefix}/${slug}`;

    items.push({
      title,
      description,
      image,
      slug,
      type,
      url,
      excerpt: getExcerpt(content),
      filePath: file,
      pubDate: frontmatter.pubDate // Pass pubDate
    });
  }
  
  return items;
}

async function main() {
  console.log('🔍 Scanning content...');

  // Load history
  let history = [];
  const historyExists = fs.existsSync(HISTORY_FILE);
  
  if (historyExists) {
    try {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    } catch (e) {
      console.error('⚠️ Error reading history file.');
    }
  }

  // Scan both sources
  const posts = await scanDirectory(BLOG_DIR, 'post', '/blog');
  const episodes = await scanDirectory(EPISODES_DIR, 'episode', '/ep');
  const allItems = [...posts, ...episodes];

  if (allItems.length === 0) {
    console.log('No content found.');
    return;
  }

  // If history file doesn't exist, this is the first run.
  // We should MARK ALL existing content as sent to prevent flooding.
  if (!historyExists) {
    console.log('📝 First run detected. Initializing history with all existing content...');
    const allSlugs = allItems.map(i => i.slug);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(allSlugs, null, 2));
    console.log(`✅ History initialized with ${allSlugs.length} items. No emails sent.`);
    return; // Exit without sending
  }

  // Normal run: Check for new items
  let sentCount = 0;
  
  for (const item of allItems) {
    if (history.includes(item.slug)) {
      continue; // Already sent
    }

    const success = await sendNewsletter(item);
    
    if (success) {
      history.push(item.slug);
      sentCount++;
      // Save continuously to prevent re-sending if script crashes
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    } else if (!mailjet) {
      // If dry run, just mark as sent? 
      // User requested "Dry Run" mode implicitly implies we might want to debug.
      // But for this logic, let's say if no API keys, we don't update history unless it was the init phase.
      // Actually, if it's dry run, we probably shouldn't update history.
      console.log(`[Dry Run] Would send newsletter for: ${item.title}`);
    }
  }

  if (sentCount === 0) {
    console.log('✨ No new content to send.');
  } else {
    console.log(`🎉 Process finished. Sent ${sentCount} newsletter(s).`);
  }
}

main();
