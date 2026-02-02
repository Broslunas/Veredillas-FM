import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { globSync } from 'glob';
import path from 'path';

import fs from 'fs';

import tailwindcss from '@tailwindcss/vite';

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
      
      // Read file content to get pubDate from frontmatter
      // This is more reliable than fs.stats which resets on new clones/deploys
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const match = content.match(/pubDate:\s*(["']?)(.*)\1/);
        if (match && match[2]) {
            const dateStr = match[2].trim();
            // Ensure valid date
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                episodeDates[url] = date.toISOString();
            }
        }
      } catch (err) {
        // Fallback to file stats if regex fails or file read error
        const stats = fs.statSync(file);
        episodeDates[url] = stats.mtime.toISOString();
      }
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
    react(),
    keystatic(),
    sitemap({
      customPages: getCustomPages(),
      filter: (page) => 
        !page.includes('/newsletter/confirm') &&
        !page.includes('/verify-comment') &&
        !page.includes('/verify-delete') &&
        // Exclude specific team members, but allow the main index
        !(page.includes('/equipo/') && page.split('/').filter(Boolean).length > 2),
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

  vite: {
    plugins: [tailwindcss()],
    ssr: {
        noExternal: ['satori']
    },
    optimizeDeps: {
        exclude: ['@resvg/resvg-js'] 
    }
  }
});