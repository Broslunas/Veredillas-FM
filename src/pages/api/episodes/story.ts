import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

export const prerender = false;

// ──────────────────────────────────────────────
// Helper: Fetch the Outfit font (with Inter fallback)
// ──────────────────────────────────────────────
const fetchFont = async (weight: number = 400) => {
    try {
        const url = weight >= 700
            ? 'https://cdn.jsdelivr.net/fontsource/fonts/outfit@latest/latin-700-normal.woff'
            : 'https://cdn.jsdelivr.net/fontsource/fonts/outfit@latest/latin-400-normal.woff';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch font');
        return await response.arrayBuffer();
    } catch {
        const response = await fetch(
            'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
        );
        return await response.arrayBuffer();
    }
};

// ──────────────────────────────────────────────
// Helper: Load & resize a cover image for embedding
// ──────────────────────────────────────────────
const loadImage = async (imagePath: string, width: number, height: number, blurRadius?: number): Promise<string | null> => {
    try {
        if (!imagePath) return null;

        let buffer: ArrayBuffer | Buffer;
        if (imagePath.startsWith('http')) {
            const response = await fetch(imagePath, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
            buffer = await response.arrayBuffer();
        } else {
            const { readFile } = await import('node:fs/promises');
            const { join } = await import('node:path');
            const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
            const fullPath = join(process.cwd(), 'public', cleanPath);
            buffer = await readFile(fullPath);
        }

        const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer));

        let pipeline = sharp(inputBuffer).resize(width, height, { fit: 'cover' });
        
        if (blurRadius) {
            pipeline = pipeline.blur(blurRadius);
        }

        const pngBuffer = await pipeline.toFormat('png').toBuffer();

        const base64 = pngBuffer.toString('base64');
        return `data:image/png;base64,${base64}`;
    } catch (e) {
        console.error(`Failed to load story image: ${imagePath}`, e);
        return null;
    }
};

// ──────────────────────────────────────────────
// Helper: Clean title (remove "ft. …" part)
// ──────────────────────────────────────────────
const cleanTitle = (title: string): string => {
    let clean = title;
    const lower = clean.toLowerCase();
    [' ft.', ' feat.', ' ft ', ' feat '].forEach(str => {
        const idx = lower.indexOf(str);
        if (idx !== -1) clean = clean.substring(0, idx).trim();
    });
    return clean;
};

// ──────────────────────────────────────────────
// GET /api/episodes/story?slug=my-episode-slug
// Returns a 1080×1920 PNG story image
// ──────────────────────────────────────────────
export const GET: APIRoute = async ({ url }) => {
    const slug = url.searchParams.get('slug');

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing "slug" query parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Find the episode
    const episodes = await getCollection('episodios');
    const episode = episodes.find(ep => ep.slug === slug);

    if (!episode) {
        return new Response(JSON.stringify({ error: `Episode not found: ${slug}` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { title, image, participants, season, episode: epNum } = episode.data as any;
    const displayTitle = cleanTitle(title);
    const guests = participants || [];

    // ── Assets ──
    const [fontRegular, fontBold, coverDataUrl, bgDataUrl, logoDataUrl] = await Promise.all([
        fetchFont(400),
        fetchFont(700),
        loadImage(image, 900, 506),
        loadImage(image, 400, 711, 50), // Low res blurred background
        loadImage('/logo.webp', 80, 80)
    ]);

    // ── Colours ──
    const accent = '#8b5cf6';

    // ── Build the card with satori ──
    const WIDTH = 1080;
    const HEIGHT = 1920;

    const svg = await satori(
        {
            type: 'div',
            props: {
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#09090b',
                    fontFamily: 'Outfit',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                },
                children: [
                    // ── Background blurred cover ──
                    bgDataUrl ? {
                        type: 'img',
                        props: {
                            src: bgDataUrl,
                            width: WIDTH,
                            height: HEIGHT,
                            style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                opacity: 0.6,
                                filter: 'blur(100px)',
                            },
                        }
                    } : null,

                    // ── Dark gradient overlay ──
                    {
                        type: 'div',
                        props: {
                            style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundImage: 'linear-gradient(to bottom, rgba(9,9,11,0.3) 0%, rgba(9,9,11,0.85) 60%, rgba(9,9,11,1) 100%)',
                            }
                        }
                    },

                    // ── Main Content Container ──
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                width: '100%',
                                height: '100%',
                                padding: '100px 70px',
                                position: 'relative',
                            },
                            children: [
                                // ── HEADER ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '60px',
                                        },
                                        children: [
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '20px',
                                                        padding: '12px 30px 12px 12px',
                                                        borderRadius: '100px',
                                                        border: '1.5px solid rgba(255,255,255,0.15)',
                                                        background: 'rgba(255,255,255,0.05)',
                                                    },
                                                    children: [
                                                        logoDataUrl ? {
                                                            type: 'img',
                                                            props: {
                                                                src: logoDataUrl,
                                                                width: 56,
                                                                height: 56,
                                                                style: { borderRadius: 28 }
                                                            }
                                                        } : null,
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '28px',
                                                                    fontWeight: 800,
                                                                    letterSpacing: '0.15em',
                                                                    color: 'white',
                                                                },
                                                                children: 'VEREDILLAS FM'
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        background: 'rgba(255,255,255,0.95)',
                                                        color: '#000',
                                                        padding: '16px 36px',
                                                        borderRadius: '100px',
                                                        fontSize: '24px',
                                                        fontWeight: 900,
                                                        letterSpacing: '0.05em',
                                                    },
                                                    children: season && epNum ? `T${season} : E${epNum}` : 'ESCUCHA'
                                                }
                                            }
                                        ]
                                    }
                                },

                                // ── IMAGE SECTION (Hero) ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            marginTop: '40px',
                                            marginBottom: '80px',
                                        },
                                        children: coverDataUrl ? [
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        padding: '24px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1.5px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '60px',
                                                    },
                                                    children: [
                                                        {
                                                            type: 'img',
                                                            props: {
                                                                src: coverDataUrl,
                                                                width: 880,
                                                                height: 495,
                                                                style: {
                                                                    borderRadius: '40px',
                                                                    objectFit: 'cover',
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ] : []
                                    }
                                },

                                // ── INFO SECTION ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            marginTop: 'auto',
                                        },
                                        children: [
                                            {
                                                type: 'h1',
                                                props: {
                                                    style: {
                                                        fontSize: '92px',
                                                        lineHeight: 1.05,
                                                        fontWeight: 900,
                                                        letterSpacing: '-0.04em',
                                                        margin: '0 0 45px 0',
                                                        maxWidth: '940px',
                                                    },
                                                    children: displayTitle
                                                }
                                            },
                                            ...(guests.length > 0 ? [{
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        flexDirection: 'column' as const,
                                                        gap: '15px',
                                                    },
                                                    children: [
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '24px',
                                                                    fontWeight: 900,
                                                                    letterSpacing: '0.25em',
                                                                    color: accent,
                                                                    marginBottom: '5px',
                                                                },
                                                                children: 'CON'
                                                            }
                                                        },
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '52px',
                                                                    fontWeight: 800,
                                                                    lineHeight: 1.2,
                                                                    color: 'rgba(255,255,255,0.95)',
                                                                },
                                                                children: guests.join('  •  ')
                                                            }
                                                        }
                                                    ]
                                                }
                                            }] : []),
                                        ]
                                    }
                                },

                                // ── FOOTER CTA ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '30px',
                                            marginTop: '100px',
                                            width: '100%',
                                        },
                                        children: [
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        width: '84px',
                                                        height: '84px',
                                                        borderRadius: 42,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        backgroundColor: accent,
                                                    },
                                                    children: [
                                                        {
                                                            type: 'div',
                                                            props: {
                                                                style: {
                                                                    width: 0,
                                                                    height: 0,
                                                                    borderTop: '16px solid transparent',
                                                                    borderBottom: '16px solid transparent',
                                                                    borderLeft: '24px solid white',
                                                                    marginLeft: '6px',
                                                                }
                                                            }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                    },
                                                    children: [
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '28px',
                                                                    fontWeight: 500,
                                                                    color: 'rgba(255,255,255,0.6)',
                                                                },
                                                                children: 'Escúchalo ahora'
                                                            }
                                                        },
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '42px',
                                                                    fontWeight: 900,
                                                                    color: 'white',
                                                                },
                                                                children: 'veredillasfm.es'
                                                            }
                                                        }
                                                    ]
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
            width: WIDTH,
            height: HEIGHT,
            fonts: [
                { name: 'Outfit', data: fontRegular, style: 'normal' as const, weight: 400 as const },
                { name: 'Outfit', data: fontBold, style: 'normal' as const, weight: 700 as const },
            ],
        }
    );

    // ── Render SVG → PNG ──
    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width' as const, value: WIDTH },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(new Uint8Array(pngBuffer), {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            'Content-Disposition': `inline; filename="Veredillas_Story_${slug}.png"`,
        },
    });
};
