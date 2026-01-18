import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

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

  return rss({
    title: 'Veredillas FM',
    description: 'El podcast oficial de Veredillas. Donde te mantenemos al pendiente de los temas más candentes.',
    site: context.site,
    xmlns: {
      media: 'http://search.yahoo.com/mrss/',
    },
    items: allContent.map(item => ({
      title: item.title,
      description: item.description,
      pubDate: item.pubDate,
      link: item.link,
      author: item.author,
      categories: item.type === 'episode' ? ['Podcast', 'Episodio'] : ['Blog'],
      customData: item.image 
        ? `<media:content type="image/${item.image.split('.').pop()}" medium="image" url="${item.image}" />`
        : undefined
    })),
    customData: `<language>es-ES</language>`,
  });
}
