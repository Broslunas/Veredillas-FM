import { getCollection } from '@/lib/content';
import dbConnect from '@/lib/mongodb';
import Team from '@/models/Team';

export async function GET() {
  // getCollection usa EPISODE_LIGHT_EXCLUDE por defecto (sin heavy fields: transcripción, quiz, dubs)
  const episodios = await getCollection('episodios');
  const posts = await getCollection('blog');

  await dbConnect();
  const teamMembers = await Team.find({ deletedAt: null }).select('name role department slug image').lean();

  const allContent = [
    ...episodios.map((episode) => ({
      id: `ep-${episode.slug}`,
      title: episode.data.title,
      description: episode.data.description || '',
      slug: `/ep/${episode.slug}`,
      type: 'Episodio',
      date: episode.data.pubDate,
      image: episode.data.image,
      tags: episode.data.tags || [],
      participants: episode.data.participants || [],
    })),
    ...posts.map((post) => ({
      id: `blog-${post.slug}`,
      title: post.data.title,
      description: post.data.description || '',
      slug: `/blog/${post.slug}`,
      type: 'Artículo',
      date: post.data.pubDate,
      image: post.data.image,
      tags: post.data.tags || [],
      participants: [],
    })),
    ...teamMembers.map((member: any) => ({
      id: `team-${member.slug}`,
      title: member.name,
      description: [member.role, member.department].filter(Boolean).join(' · '),
      slug: `/equipo/${member.slug}`,
      type: 'Equipo',
      date: null,
      image: member.image,
      tags: [],
      participants: [],
    })),
  ];

  return new Response(JSON.stringify(allContent), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30, s-maxage=60',
    },
  });
}
