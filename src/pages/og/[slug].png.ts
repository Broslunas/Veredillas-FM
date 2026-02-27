import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

export const prerender = true;

export async function getStaticPaths() {
    const episodes = await getCollection('episodios');
    return episodes.map((entry) => ({
        params: { slug: entry.slug },
        props: { entry },
    }));
}

// Fetch font securely or use a local one
const fetchFont = async () => {
    // Fallback to Inter for stability during build
    try {
        const response = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/outfit@latest/latin-400-normal.woff');
        if (!response.ok) throw new Error('Failed to fetch font');
        return await response.arrayBuffer();
    } catch (e) {
        // Fallback to a guaranteed working font if the above fails (e.g. from satori-recommended CDN)
        const response = await fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff');
        return await response.arrayBuffer();
    }
};

const loadImage = async (imagePath: string): Promise<ArrayBuffer | null> => {
    try {
        if (!imagePath) return null;

        let buffer;
        if (imagePath.startsWith('http')) {
            const response = await fetch(imagePath);
            if (!response.ok) throw new Error(`Failed to fetch remote image: ${response.statusText}`);
            buffer = await response.arrayBuffer();
        } else {
            // Local file resolution for build time (SSG)
            const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
            const fullPath = join(process.cwd(), 'public', cleanPath);
            buffer = await readFile(fullPath);
        }

        // Convert to Buffer if needed (node:fs returns Buffer, fetch returns ArrayBuffer)
        const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer as ArrayBuffer));

        // Convert to PNG using sharp to ensure compatibility (handles WebP, etc.)
        const pngBuffer = await sharp(inputBuffer)
            .resize(1200, 630, { fit: 'cover' })
            .toFormat('png')
            .toBuffer();

        return new Uint8Array(pngBuffer).buffer;

    } catch (e) {
        console.error(`Failed to load image for OG generation: ${imagePath}`, e);
        return null;
    }
};

export const GET: APIRoute = async ({ props }) => {
    const { entry } = props;
    const { title, episode, season, image } = entry.data;
    
    const [fontData, imageBuffer] = await Promise.all([
        fetchFont(),
        loadImage(image)
    ]);

    const svg = await satori(
        {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    height: '100%',
                    width: '100%',
                    backgroundColor: '#030304',
                    fontFamily: 'Outfit',
                    position: 'relative',
                    overflow: 'hidden',
                },
                children: [
                    // Background Image
                    imageBuffer ? {
                        type: 'img',
                        props: {
                            src: imageBuffer,
                            width: 1200,
                            height: 630,
                            style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: 0.8, // Slightly dim the image
                            },
                        }
                    } : null,
                    // Dark Gradient Overlay (Professional Look)
                    {
                        type: 'div',
                        props: {
                            style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                // Strong gradient from bottom-left to top-right
                                background: 'linear-gradient(to right, rgba(3,3,4,0.95) 30%, rgba(3,3,4,0.4) 100%)',
                            }
                        }
                    },
                    // Content Container
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                height: '100%',
                                width: '100%',
                                padding: '60px 80px',
                                position: 'relative',
                            },
                            children: [
                                // Top Label: Season & Episode
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '24px',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            color: '#c4b5fd', // violet-300
                                            marginBottom: '24px',
                                        },
                                        children: [
                                            {
                                                type: 'span',
                                                props: {
                                                    style: {
                                                        backgroundColor: 'rgba(139, 92, 246, 0.2)', // primary/20
                                                        color: '#a78bfa', // violet-400
                                                        padding: '6px 16px',
                                                        borderRadius: '50px',
                                                        marginRight: '16px',
                                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                                    },
                                                    children: `T${season} : E${episode}`
                                                }
                                            },
                                            'Veredillas FM'
                                        ]
                                    }
                                },
                                // Main Title
                                {
                                    type: 'h1',
                                    props: {
                                        style: {
                                            fontSize: '72px',
                                            fontWeight: 800,
                                            lineHeight: 1.1,
                                            margin: 0,
                                            color: 'white',
                                            textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                            maxWidth: '900px',
                                            display: '-webkit-box',
                                            textOverflow: 'ellipsis',
                                            overflow: 'hidden',
                                            maxHeight: '320px', 
                                        },
                                        children: title
                                    }
                                },
                                // Footer / Call to Action
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            marginTop: 'auto',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '15px',
                                        },
                                        children: [
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        height: '4px',
                                                        width: '60px',
                                                        backgroundColor: '#8b5cf6', // primary color
                                                        borderRadius: '2px',
                                                    }
                                                }
                                            },
                                            {
                                                type: 'span',
                                                props: {
                                                    style: {
                                                        fontSize: '20px',
                                                        color: '#d4d4d8', // zinc-300
                                                    },
                                                    children: 'Escúchalo ahora en veredillasfm.es'
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ],
            },
        } as any,
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: 'Outfit',
                    data: fontData,
                    style: 'normal',
                },
            ],
        }
    );

    const resvg = new Resvg(svg);
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(new Uint8Array(pngBuffer), {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
};
