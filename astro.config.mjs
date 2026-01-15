import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { globSync } from 'glob';
import path from 'path';

import fs from 'fs';

const SITE_URL = 'https://veredillasfm.es';

// Store episode dates to use in serialize
const episodeDates = {};

// Helper to get dynamic pages for sitemap (since we use SSR)
function getCustomPages() {
  const pages = [];
  
  // Episodios
  try {
    const episodios = globSync('src/content/episodios/*.md');
    episodios.forEach(file => {
      const slug = path.basename(file, '.md');
      const url = `${SITE_URL}/ep/${slug}`; // Ensure no trailing slash for consistency check
      pages.push(url);
      
      // Store modification time
      const stats = fs.statSync(file);
      episodeDates[url] = stats.mtime.toISOString();
    });
  } catch (e) {
    console.error('Error loading episodes for sitemap:', e);
  }

  return pages;
}

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  adapter: vercel(),
  integrations: [
    sitemap({
      customPages: getCustomPages(),
      filter: (page) => 
        !page.includes('/newsletter/confirm') &&
        !page.includes('/verify-comment') &&
        !page.includes('/verify-delete'),
      serialize: (item) => {
        // Default values
        item.changefreq = 'monthly';
        item.priority = 0.5;

        // Home
        if (item.url === `${SITE_URL}/`) {
            item.changefreq = 'daily';
            item.priority = 1.0;
        }
        
        // Blog Index & Episodes Index
        else if (item.url === `${SITE_URL}/blog/` || item.url === `${SITE_URL}/ep/`) {
            item.changefreq = 'weekly';
            item.priority = 0.8;
        }

        // Episodes Details
        else if (item.url.includes('/ep/')) {
            item.changefreq = 'monthly'; // Ep content doesn't change often
            item.priority = 0.7;
            
            // Apply real lastmod if we have it (normalize URL to match key)
            const cleanUrl = item.url.replace(/\/$/, ''); 
            if (episodeDates[cleanUrl]) {
                item.lastmod = episodeDates[cleanUrl];
            }
        }
        
        // Blog Posts
        else if (item.url.includes('/blog/')) {
             item.changefreq = 'monthly';
             item.priority = 0.7;
        }
        
        // Contact, Team, About
        else if (item.url.includes('/contacto') || item.url.includes('/equipo') || item.url.includes('/about')) {
            item.changefreq = 'monthly';
            item.priority = 0.6;
        }
        
        // Legal
        else if (item.url.includes('/politica') || item.url.includes('/terminos') || item.url.includes('/cookies')) {
            item.changefreq = 'yearly';
            item.priority = 0.1;
        }

        return item;
      }
    })
  ],
});
