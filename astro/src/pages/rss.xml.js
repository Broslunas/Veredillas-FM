import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET(context) {
  const episodios = await getCollection('episodios');
  const blog = await getCollection('blog');
  
  // Combine and sort all content by date
  const allContent = [
    ...episodios.map(ep => ({
      title: ep.data.title,
      description: ep.data.description,
      pubDate: ep.data.pubDate,
      link: `/ep/${ep.slug}/`,
      author: ep.data.author,
      type: 'episode',
      image: ep.data.image
    })),
    ...blog.map(post => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,
      author: post.data.author,
      type: 'post',
      image: post.data.image
    }))
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  const response = await rss({
    title: 'Veredillas FM',
    description: 'El podcast oficial de Veredillas. Donde te mantenemos al pendiente de los temas más candentes.',
    site: context.site,
    items: allContent.map(item => ({
      title: item.title,
      description: item.description,
      pubDate: item.pubDate,
      link: item.link,
      author: item.author,
      categories: item.type === 'episode' ? ['Podcast', 'Episodio'] : ['Blog'],
      customData: item.image 
        ? `<image>${item.image}</image>`
        : undefined
    })),
    customData: `<language>es-ES</language>`,
  });

  // Add cache control headers: 1 hour in CDN, with stale-while-revalidate for 30 minutes
  response.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');
  
  return response;
}
