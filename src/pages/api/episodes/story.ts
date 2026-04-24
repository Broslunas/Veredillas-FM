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
        loadImage(image, 700, 700),
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
                                opacity: 0.4,
                            },
                        }
                    } : null,

                    // ── Dark overlay ──
                    {
                        type: 'div',
                        props: {
                            style: {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                            }
                        }
                    },

                    // ── Content layer ──
                    {
                        type: 'div',
                        props: {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                padding: '120px 80px 100px 80px',
                            },
                            children: [
                                // ── Top bar: Logo + Episode pill ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '80px',
                                            width: '100%',
                                        },
                                        children: [
                                            // Brand badge
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '24px',
                                                        padding: '16px 36px 16px 16px',
                                                        borderRadius: '100px',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        background: 'rgba(255,255,255,0.05)',
                                                    },
                                                    children: [
                                                        logoDataUrl ? {
                                                            type: 'img',
                                                            props: {
                                                                src: logoDataUrl,
                                                                width: 64,
                                                                height: 64,
                                                                style: {
                                                                    borderRadius: 32,
                                                                    border: '2px solid rgba(255,255,255,0.2)',
                                                                }
                                                            }
                                                        } : null,
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '32px',
                                                                    fontWeight: 800,
                                                                    letterSpacing: '0.15em',
                                                                    color: 'white',
                                                                },
                                                                children: 'VEREDILLAS FM'
                                                            }
                                                        }
                                                    ].filter(Boolean)
                                                }
                                            },
                                            // Escucha pill
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '16px',
                                                        background: 'rgba(255,255,255,0.95)',
                                                        color: '#000',
                                                        padding: '20px 40px',
                                                        borderRadius: '100px',
                                                        fontSize: '26px',
                                                        fontWeight: 800,
                                                        letterSpacing: '0.1em',
                                                    },
                                                    children: [
                                                        {
                                                            type: 'div',
                                                            props: {
                                                                style: {
                                                                    width: '14px',
                                                                    height: '14px',
                                                                    background: '#e11d48',
                                                                    borderRadius: '50%',
                                                                }
                                                            }
                                                        },
                                                        season && epNum ? `T${season} : E${epNum}` : 'ESCUCHA'
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                },

                                // ── Cover image (centered) ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            flex: 1,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        },
                                        children: coverDataUrl ? [
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        position: 'relative',
                                                        borderRadius: '40px',
                                                        overflow: 'hidden',
                                                        border: '2px solid rgba(255,255,255,0.1)',
                                                    },
                                                    children: [
                                                        {
                                                            type: 'img',
                                                            props: {
                                                                src: coverDataUrl,
                                                                width: 700,
                                                                height: 700,
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

                                // ── Text content ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            marginTop: '80px',
                                            padding: '0 40px',
                                        },
                                        children: [
                                            // Title
                                            {
                                                type: 'h1',
                                                props: {
                                                    style: {
                                                        fontSize: '85px',
                                                        lineHeight: 1.05,
                                                        fontWeight: 900,
                                                        letterSpacing: '-0.02em',
                                                        margin: '0 0 40px 0',
                                                        maxWidth: '920px',
                                                        overflow: 'hidden',
                                                    },
                                                    children: displayTitle
                                                }
                                            },

                                            // Guests (if any)
                                            ...(guests.length > 0 ? [{
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        flexDirection: 'column' as const,
                                                        gap: '12px',
                                                        marginBottom: '50px',
                                                    },
                                                    children: [
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '22px',
                                                                    fontWeight: 800,
                                                                    padding: '6px 16px',
                                                                    borderRadius: '6px',
                                                                    color: '#fff',
                                                                    backgroundColor: accent,
                                                                    display: 'flex',
                                                                    alignSelf: 'flex-start',
                                                                },
                                                                children: 'FEATURING'
                                                            }
                                                        },
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '56px',
                                                                    fontWeight: 800,
                                                                    lineHeight: 1.1,
                                                                    color: accent,
                                                                    marginTop: '10px',
                                                                },
                                                                children: guests.join(', ')
                                                            }
                                                        }
                                                    ]
                                                }
                                            }] : []),
                                        ]
                                    }
                                },

                                // ── Spacer to push footer down ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            flex: 1,
                                        }
                                    }
                                },

                                // ── Footer ──
                                {
                                    type: 'div',
                                    props: {
                                        style: {
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            paddingTop: '40px',
                                            gap: '40px',
                                            width: '100%',
                                        },
                                        children: [
                                            {
                                                type: 'div',
                                                props: {
                                                    style: {
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '24px',
                                                        padding: '16px 48px 16px 16px',
                                                        borderRadius: '100px',
                                                        background: 'rgba(255,255,255,0.05)',
                                                    },
                                                    children: [
                                                        {
                                                            type: 'div',
                                                            props: {
                                                                style: {
                                                                    width: '64px',
                                                                    height: '64px',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    backgroundColor: accent,
                                                                },
                                                                children: []
                                                            }
                                                        },
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '32px',
                                                                    fontWeight: 500,
                                                                    color: 'rgba(255,255,255,0.9)',
                                                                },
                                                                children: 'Escucha en '
                                                            }
                                                        },
                                                        {
                                                            type: 'span',
                                                            props: {
                                                                style: {
                                                                    fontSize: '32px',
                                                                    fontWeight: 800,
                                                                    color: accent,
                                                                },
                                                                children: 'vrdfm.es'
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                },
                            ]
                        }
                    }
                ].filter(Boolean),
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
