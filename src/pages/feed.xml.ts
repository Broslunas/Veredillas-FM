import { marked } from 'marked';
import dbConnect from '@/lib/mongodb';
import EpisodeContent from '@/models/EpisodeContent';

export const prerender = false;

const SITE_URL = 'https://www.veredillasfm.es';
const FEED_URL = `${SITE_URL}/feed.xml`;
const PODCAST_COVER_URL = import.meta.env.PODCAST_COVER_URL || `${SITE_URL}/logo.png`;
const OWNER_EMAIL = 'pablo.luna.perez.008@gmail.com';

const EXTENSION_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/x-m4a',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  aac: 'audio/aac',
};

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cdata(value: string): string {
  return `<![CDATA[${value}]]>`;
}

function guessMimeType(url: string): string {
  const ext = url.split('.').pop()?.split(/[?#]/)[0]?.toLowerCase();
  return (ext && EXTENSION_MIME[ext]) || 'audio/mpeg';
}

// Episode `duration` is a free-text field entered in the panel (e.g. "45 min",
// or occasionally an already-formatted "HH:MM:SS"). itunes:duration wants
// HH:MM:SS, so we normalize the common "N min" shape and pass through anything
// that already looks like a duration.
function formatItunesDuration(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;

  const minutesMatch = trimmed.match(/^(\d+)\s*m/i);
  if (minutesMatch) {
    const totalMinutes = parseInt(minutesMatch[1], 10);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
  }

  if (/^\d+$/.test(trimmed)) return trimmed;

  return undefined;
}

async function getEnclosureInfo(url: string): Promise<{ length: string; type: string }> {
  const fallback = { length: '0', type: guessMimeType(url) };
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return fallback;
    return {
      length: res.headers.get('content-length') || fallback.length,
      type: res.headers.get('content-type') || fallback.type,
    };
  } catch {
    return fallback;
  }
}

export async function GET() {
  await dbConnect();

  const episodes = await EpisodeContent.find({ status: { $ne: 'draft' }, deletedAt: null })
    .sort({ pubDate: -1 })
    .lean();

  const items = await Promise.all(
    episodes.map(async (ep) => {
      const { length, type } = await getEnclosureInfo(ep.audioUrl || '');
      const html = marked.parse((ep.body || ep.description || '').trim()) as string;
      const duration = formatItunesDuration(ep.duration);
      const image = ep.image || PODCAST_COVER_URL;
      const link = `${SITE_URL}/ep/${ep.slug}/`;

      return `\t\t<item>
\t\t\t<title>${cdata(ep.title)}</title>
\t\t\t<description>${cdata(html)}</description>
\t\t\t<link>${escapeXml(link)}</link>
\t\t\t<guid isPermaLink="false">${escapeXml(ep.slug)}</guid>
\t\t\t<dc:creator>${cdata(ep.author || 'Veredillas FM')}</dc:creator>
\t\t\t<pubDate>${ep.pubDate.toUTCString()}</pubDate>
\t\t\t<enclosure url="${escapeXml(ep.audioUrl || '')}" length="${length}" type="${type}"/>
\t\t\t<itunes:summary>${escapeXml(html)}</itunes:summary>
\t\t\t<itunes:explicit>false</itunes:explicit>${duration ? `\n\t\t\t<itunes:duration>${duration}</itunes:duration>` : ''}
\t\t\t<itunes:image href="${escapeXml(image)}"/>${ep.season ? `\n\t\t\t<itunes:season>${ep.season}</itunes:season>` : ''}${ep.episode ? `\n\t\t\t<itunes:episode>${ep.episode}</itunes:episode>` : ''}
\t\t\t<itunes:episodeType>full</itunes:episodeType>
\t\t</item>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" version="2.0" xmlns:anchor="https://anchor.fm/xmlns" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:psc="http://podlove.org/simple-chapters">
\t<channel>
\t\t<title>${cdata('Veredillas FM')}</title>
\t\t<description>${cdata('Veredillas FM donde te mantenemos al pendiente de los temas más candentes.')}</description>
\t\t<link>${SITE_URL}</link>
\t\t<generator>Veredillas FM</generator>
\t\t<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
\t\t<atom:link href="${FEED_URL}" rel="self" type="application/rss+xml"/>
\t\t<author>${cdata('Veredillas FM')}</author>
\t\t<copyright>${cdata('Veredillas FM')}</copyright>
\t\t<language>${cdata('es-es')}</language>
\t\t<atom:link rel="hub" href="https://pubsubhubbub.appspot.com/"/>
\t\t<itunes:author>Veredillas FM</itunes:author>
\t\t<itunes:summary>Veredillas FM donde te mantenemos al pendiente de los temas más candentes.</itunes:summary>
\t\t<itunes:type>episodic</itunes:type>
\t\t<itunes:owner>
\t\t\t<itunes:name>Veredillas FM</itunes:name>
\t\t\t<itunes:email>${OWNER_EMAIL}</itunes:email>
\t\t</itunes:owner>
\t\t<itunes:explicit>false</itunes:explicit>
\t\t<itunes:category text="Education"/>
\t\t<itunes:image href="${escapeXml(PODCAST_COVER_URL)}"/>
${items.join('\n')}
\t</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
