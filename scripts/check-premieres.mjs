import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Configuración
const EPISODES_DIR = 'src/content/episodios';
const WINDOW_MS = 60 * 60 * 1000; // Ventana de 1 hora para mayor seguridad

function parseDurationToMs(durationStr) {
    if (!durationStr) return 0;
    
    let durationMs = 0;
    try {
        if (durationStr.toLowerCase().includes("min")) {
            durationMs = parseInt(durationStr) * 60 * 1000;
        } else if (durationStr.includes(":")) {
            const parts = durationStr.split(":").map(Number);
            if (parts.length === 2) durationMs = (parts[0] * 60 + parts[1]) * 1000;
            else if (parts.length === 3)
                durationMs = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        }
    } catch (e) {
        console.error("Error parsing duration:", durationStr);
    }
    return durationMs;
}

const now = new Date();
let shouldRedeploy = false;

if (!fs.existsSync(EPISODES_DIR)) {
    console.error("No se encontró el directorio de episodios");
    process.exit(1);
}

const files = fs.readdirSync(EPISODES_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

for (const file of files) {
    try {
        const content = fs.readFileSync(path.join(EPISODES_DIR, file), 'utf-8');
        const { data } = matter(content);

        // Verificamos si es un estreno y si la fecha de publicación existe
        if (data.isPremiere && data.pubDate) {
            const pubDate = new Date(data.pubDate);
            const durationMs = parseDurationToMs(data.duration);
            const endDate = new Date(pubDate.getTime() + durationMs);
            
            const diff = now.getTime() - endDate.getTime();
            
            // Si el estreno terminó (diff > 0) y fue hace poco ( < WINDOW_MS)
            if (diff > 0 && diff < WINDOW_MS) {
                console.log(`✅ ESTRENO FINALIZADO: "${data.title}"`);
                console.log(`Finalizó el: ${endDate.toLocaleString()}`);
                shouldRedeploy = true;
                break; // Con uno es suficiente
            }
        }
    } catch (err) {
        console.error(`Error procesando archivo ${file}:`, err);
    }
}

if (shouldRedeploy) {
    console.log("🚀 Disparando redeploy en Vercel...");
    process.exit(0); // Exit code 0 indica que hay que redesplegar
} else {
    console.log("nx No hay estrenos recientes que requieran redeploy.");
    process.exit(1); // Exit code 1 indica que no hay cambios
}
