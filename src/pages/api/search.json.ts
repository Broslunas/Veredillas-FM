import { getCollection } from 'astro:content';
import { teamMembers } from '../../data/team';

export async function GET() {
  const episodios = await getCollection('episodios');
  const posts = await getCollection('blog');

  const allContent = [
    ...episodios.map((episode) => ({
      title: episode.data.title,
      description: episode.data.description,
      slug: `/ep/${episode.slug}`,
      type: 'Episodio',
      date: episode.data.pubDate,
      image: episode.data.image,
      tags: episode.data.tags || [],
      participants: episode.data.participants || [],
      transcription: episode.data.transcription ? episode.data.transcription.map(t => ({ text: t.text, time: t.time })) : undefined,
      transcriptionText: episode.data.transcription ? episode.data.transcription.map(t => t.text).join(' ') : '',
    })),
    ...posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      slug: `/blog/${post.slug}`,
      type: 'Artículo',
      date: post.data.pubDate,
      image: post.data.image,
      tags: post.data.tags || [],
    })),
    // Integrantes del Equipo
    ...teamMembers.map((member) => {
      // Slugify simple
      const memberSlug = member.name
        .toLowerCase()
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

      return {
        title: member.name,
        description: `${member.role} - ${member.department}`,
        slug: `/equipo/${memberSlug}`, // Updated to new subpage structure
        type: 'Equipo',
        date: new Date().toISOString(), // Fecha simulada más reciente
        image: member.image,
      };
    }),
    // Páginas Estáticas (Acciones Rápidas)
    { title: 'Inicio', description: 'Ir a la página principal', slug: '/', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'Blog', description: 'Ver todos los artículos', slug: '/blog', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'Episodios', description: 'Escuchar el podcast', slug: '/ep', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'Equipo', description: 'Conoce a los creadores', slug: '/equipo', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'Contacto', description: 'Envíanos un mensaje', slug: '/contacto', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'Newsletter', description: 'Suscríbete a nuestro newsletter', slug: '/newsletter', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'Calendario', description: 'Ver calendario de eventos', slug: '/calendario', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'Galeria', description: 'Ver galeria de imagenes', slug: '/galeria', type: 'Navegación', date: new Date().toISOString(), image: '/favicon.png' },
    { title: 'IA Veredillas', description: 'Chat con inteligencia artificial', slug: '#chat-toggle-btn', type: 'Herramienta', date: new Date().toISOString(), image: '/logo.png' },
  ];

  // Ordenar por fecha (más reciente primero)
  allContent.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return new Response(JSON.stringify(allContent), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
