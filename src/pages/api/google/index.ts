import { getCollection } from 'astro:content';

export const prerender = false;

export async function POST({ request }: { request: Request }) {
  const body = await request.json();
  const { queryResult } = body;
  const intentName = queryResult.intent.displayName;

  let response;

  if (intentName === 'Default Welcome Intent') {
    response = handleWelcome();
  } else if (intentName === 'UltimoEpisodioIntent') {
    response = await handleLastEpisode();
  } else if (intentName === 'PlayEpisodeIntent') {
    const query = queryResult.parameters?.episodio;
    response = await handlePlayEpisode(query);
  } else {
    response = handleFallback();
  }

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function handleWelcome() {
  return {
    fulfillmentText: '¡Hola! Bienvenido a Veredillas FM. ¿Qué te gustaría escuchar?',
    payload: {
      google: {
        expectUserResponse: true,
        richResponse: {
          items: [
            {
              simpleResponse: {
                textToSpeech: '¡Hola! Bienvenido a Veredillas FM. ¿Qué te gustaría escuchar?'
              }
            }
          ]
        }
      }
    }
  };
}

async function handleLastEpisode() {
  const episodios = await getCollection('episodios');
  const lastEp = episodios.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())[0];

  if (!lastEp) {
    return {
      fulfillmentText: 'No he encontrado ningún episodio en este momento.'
    };
  }

  const text = `El último episodio es: ${lastEp.data.title}. Fue publicado el ${lastEp.data.pubDate.toLocaleDateString('es-ES')}. ¿Quieres escucharlo?`;

  return {
    fulfillmentText: text,
    payload: {
      google: {
        expectUserResponse: true,
        richResponse: {
          items: [
            {
              simpleResponse: {
                textToSpeech: text
              }
            }
          ],
          suggestions: [
            { title: 'Sí' },
            { title: 'No' },
            { title: 'Último episodio' }
          ]
        }
      }
    }
  };
}

async function handlePlayEpisode(query: string | undefined) {
    const episodios = await getCollection('episodios');
    let targetEp;

    if (query) {
        targetEp = episodios.find(ep => ep.data.title.toLowerCase().includes(query.toLowerCase()));
    } else {
        targetEp = episodios.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())[0];
    }

    if (!targetEp || !targetEp.data.audioUrl) {
        return {
            fulfillmentText: 'Lo siento, no he podido encontrar ese audio.'
        };
    }

    return {
        fulfillmentText: `Reproduciendo ${targetEp.data.title}`,
        payload: {
            google: {
                expectUserResponse: false,
                richResponse: {
                    items: [
                        {
                            simpleResponse: {
                                textToSpeech: `Reproduciendo ${targetEp.data.title}`
                            }
                        },
                        {
                            mediaResponse: {
                                mediaType: 'AUDIO',
                                mediaObjects: [
                                    {
                                        name: targetEp.data.title,
                                        description: 'Veredillas FM',
                                        contentUrl: targetEp.data.audioUrl,
                                        icon: {
                                            url: targetEp.data.image || 'https://veredillas.fm/logo.png',
                                            accessibilityText: 'Veredillas FM Logo'
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
        }
    };
}

function handleFallback() {
  return {
    fulfillmentText: 'Lo siento, no he entendido eso. Prueba a pedir el último episodio.'
  };
}
