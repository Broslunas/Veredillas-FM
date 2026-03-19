/**
 * Transforma una URL completa de Veredillas FM a su versión acortada con vrdfm.es
 */
export function getShortLink(url: string | URL): string {
    let urlStr = url.toString();
    
    // Si ya es un short link, no hacemos nada
    if (urlStr.includes('vrdfm.es')) return urlStr;
    
    // Dominios conocidos de la web
    const domains = [
        'www.veredillasfm.es',
        'veredillasfm.es',
        'veredillas-fm.vercel.app',
        'localhost:4321' // Para desarrollo
    ];
    
    for (const domain of domains) {
        if (urlStr.includes(domain)) {
            return urlStr.replace(domain, 'vrdfm.es');
        }
    }
    
    // Si no coincide con ninguno pero es de la app (ej: subdominios de vercel o preview)
    // intentamos una sustitución genérica si parece ser una URL absoluta
    if (urlStr.startsWith('http')) {
        try {
            const parsed = new URL(urlStr);
            // Si el path no es vacío, podríamos intentar forzar vrdfm.es
            // Pero por seguridad solo lo hacemos si estamos seguros.
            // Por ahora, si no coincide con los dominios conocidos, devolvemos la original.
        } catch (e) {
            // URL inválida, devolver original
        }
    }
    
    return urlStr;
}
