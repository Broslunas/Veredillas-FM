import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const EPISODES_DIR = 'src/content/episodios';
const README_PATH = 'README.md';
const SITE_URL = 'https://veredillasfm.es';

function updateReadme() {
    if (!fs.existsSync(EPISODES_DIR)) {
        console.error("Directorio de episodios no encontrado");
        return;
    }

    const files = fs.readdirSync(EPISODES_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

    const episodes = files.map(file => {
        try {
            const content = fs.readFileSync(path.join(EPISODES_DIR, file), 'utf-8');
            const { data } = matter(content);
            return {
                title: data.title,
                pubDate: new Date(data.pubDate),
                description: data.description,
                image: data.image,
                slug: file.replace(/\.mdx?$/, ''),
                season: data.season,
                episode: data.episode
            };
        } catch (e) {
            console.error(`Error procesando ${file}:`, e);
            return null;
        }
    })
    .filter(ep => ep && ep.pubDate <= new Date())
    .sort((a, b) => b.pubDate - a.pubDate)
    .slice(0, 4); // Mostramos los 4 más recientes

    let episodesMarkdown = '\n<div align="center">\n\n';

    episodes.forEach(ep => {
        const dateStr = ep.pubDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        const url = `${SITE_URL}/ep/${ep.slug}`;
        
        episodesMarkdown += `<a href="${url}">\n`;
        episodesMarkdown += `<img src="${ep.image}" width="200" style="border-radius: 8px; margin: 10px;" alt="${ep.title}"/>\n`;
        episodesMarkdown += `</a>\n`;
    });

    episodesMarkdown += '\n\n';

    episodes.forEach(ep => {
        const dateStr = ep.pubDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
        const url = `${SITE_URL}/ep/${ep.slug}`;
        episodesMarkdown += `**[${ep.title}](${url})**<br/>\n`;
        episodesMarkdown += `*${dateStr} • Temporada ${ep.season}, Episodio ${ep.episode}*\n\n`;
    });

    episodesMarkdown += '</div>\n';

    const readmeContent = fs.readFileSync(README_PATH, 'utf-8');
    const startMarker = '<!-- EPISODES_START -->';
    const endMarker = '<!-- EPISODES_END -->';

    const startIndex = readmeContent.indexOf(startMarker);
    const endIndex = readmeContent.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error('Markers not found in README.md');
        return;
    }

    const newReadmeContent = 
        readmeContent.substring(0, startIndex + startMarker.length) + 
        episodesMarkdown + 
        readmeContent.substring(endIndex);

    fs.writeFileSync(README_PATH, newReadmeContent);
    console.log('README.md actualizado con los últimos episodios.');
}

updateReadme();
