import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';


// Fetch font securely or use a local one (simplified for this example, we'll try to fetch Inter)
const fetchFont = async () => {
  const response = await fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff');
  return await response.arrayBuffer();
};

export const GET: APIRoute = async ({ params, props, site }) => {
  const { slug } = params;

  if (!slug) {
    return new Response('Slug missing', { status: 404 });
  }

  const entry = await getEntry('episodios', slug);

  if (!entry) {
    return new Response('Episode not found', { status: 404 });
  }

  const { title, episode, season, image } = entry.data;

  // Font data
  const fontData = await fetchFont();

  // Background image handling - simplified logic
  // Ideally, we might want to load the episode image as a background if available, 
  // or use a nice gradient. Let's start with a nice gradient and current aesthetic.

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          height: '100%',
          width: '100%',
          backgroundColor: '#1a103d',
          backgroundImage: 'linear-gradient(135deg, #1a103d 0%, #4c1d95 100%)',
          color: 'white',
          fontFamily: 'Inter',
          position: 'relative',
        },
        children: [
          // Background pattern or noise (simulated with opacity)
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.2) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 255, 255, 0.2) 2%, transparent 0%)',
                backgroundSize: '100px 100px',
                opacity: 0.1,
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
                alignItems: 'center',
                textAlign: 'center',
                width: '100%',
                height: '100%',
                padding: '40px',
              },
              children: [
                 // Top Info (Season/Episode)
                 {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                            fontSize: '24px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: '#e9d5ff', // purple-200
                        },
                        children: [
                            `Temporada ${season} • Episodio ${episode}`
                        ]
                    }
                 },
                 // Title
                 {
                    type: 'h1',
                    props: {
                        style: {
                            fontSize: '60px',
                            fontWeight: 'bold',
                            lineHeight: 1.1,
                            margin: 0,
                            marginBottom: '30px',
                            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                            background: 'linear-gradient(to bottom right, #ffffff, #d8b4fe)',
                            backgroundClip: 'text',
                            color: 'transparent', // satori supports basic gradient text usually
                        },
                        children: title
                    }
                 },
                 // Branding Footer
                 {
                    type: 'div',
                    props: {
                        style: {
                            position: 'absolute',
                            bottom: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        },
                        children: [
                             // We could load the logo image here if we read it from disk
                             // For now just text
                             {
                                type: 'span',
                                props: {
                                    style: {
                                        fontSize: '20px',
                                        fontWeight: 600,
                                        color: '#a78bfa',
                                    },
                                    children: 'Veredillas FM'
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
          name: 'Inter',
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
    },
  });
};
