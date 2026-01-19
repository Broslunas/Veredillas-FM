import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

export const prerender = false;

// Fetch font securely
const fetchFont = async () => {
    const response = await fetch('https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4tc1.woff2');
    return await response.arrayBuffer();
};

const fetchImage = async (url: string) => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch image');
        return await response.arrayBuffer();
    } catch (e) {
        console.error(`Failed to fetch image from ${url}`, e);
        return null;
    }
};

export const GET: APIRoute = async ({ params, request }) => {
    const { slug } = params;

    if (!slug) return new Response('Slug missing', { status: 404 });

    const entry = await getEntry('episodios', slug);
    if (!entry) return new Response('Episode not found', { status: 404 });

    const { title, episode, season, image } = entry.data;
    const fontData = await fetchFont();

    // Resolve Image URL
    let imageBuffer: ArrayBuffer | null = null;
    if (image) {
        // Construct absolute URL for the image
        const origin = new URL(request.url).origin;
        // If image is already absolute (http), use it; otherwise prepend origin
        // Note: For local development, localhost works. For PROD, origin should be the site URL.
        const imageUrl = image.startsWith('http') ? image : new URL(image, origin).href;
        
        imageBuffer = await fetchImage(imageUrl);
    }

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
                                opacity: 0.8, // Slightly dim the image itself
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
                                zIndex: 10,
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
                                            // Ensure long titles don't overflow vertically if possible
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
        },
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

    return new Response(pngBuffer, {
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
};
