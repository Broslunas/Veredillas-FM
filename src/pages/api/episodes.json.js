import { getCollection } from 'astro:content';

export async function GET() {
  const episodios = await getCollection('episodios');
  
  const episodesData = episodios.map(ep => ({
    id: ep.slug,
    title: ep.data.title,
    description: ep.data.description,
    pubDate: ep.data.pubDate,
    image: ep.data.image,
    spotifyUrl: ep.data.spotifyUrl,
    audioUrl: ep.data.audioUrl,
    videoUrl: ep.data.videoUrl,
    duration: ep.data.duration
  })).sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return new Response(JSON.stringify(episodesData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
