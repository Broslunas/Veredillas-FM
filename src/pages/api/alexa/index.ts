import { getCollection } from 'astro:content';

export const prerender = false;

export async function POST({ request }: { request: Request }) {
  const body = await request.json();
  const { request: alexaRequest, session, context } = body;

  console.log('Alexa Request:', alexaRequest.type);

  let response;

  if (alexaRequest.type === 'LaunchRequest') {
    response = handleLaunchRequest();
  } else if (alexaRequest.type === 'IntentRequest') {
    const intentName = alexaRequest.intent.name;
    
    if (intentName === 'UltimoEpisodioIntent') {
      response = await handleLastEpisodeIntent();
    } else if (intentName === 'AMAZON.HelpIntent') {
      response = handleHelpIntent();
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
      response = handleCancelIntent();
    } else if (intentName === 'PlayEpisodeIntent') {
        const query = alexaRequest.intent.slots?.episodio?.value;
        response = await handlePlayEpisodeIntent(query);
    } else {
      response = handleFallbackIntent();
    }
  } else if (alexaRequest.type === 'SessionEndedRequest') {
    return new Response(null, { status: 200 });
  } else {
    response = handleFallbackIntent();
  }

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function handleLaunchRequest() {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: 'Bienvenido a Veredillas FM. Puedes pedirme el último episodio o buscar contenido específico.'
      },
      reprompt: {
        outputSpeech: {
          type: 'PlainText',
          text: '¿Qué te gustaría escuchar?'
        }
      },
      shouldEndSession: false
    }
  };
}

async function handleLastEpisodeIntent() {
  const episodios = await getCollection('episodios');
  const lastEp = episodios.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())[0];

  if (!lastEp) {
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Lo siento, no he podido encontrar ningún episodio en este momento.'
        },
        shouldEndSession: true
      }
    };
  }

  const text = `El último episodio es: ${lastEp.data.title}. Fue publicado el ${lastEp.data.pubDate.toLocaleDateString('es-ES')}. ${lastEp.data.audioUrl ? '¿Quieres que lo reproduzca?' : ''}`;

  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: text
      },
      reprompt: {
        outputSpeech: {
          type: 'PlainText',
          text: '¿Quieres que lo reproduzca?'
        }
      },
      shouldEndSession: false
    }
  };
}

async function handlePlayEpisodeIntent(query: string | undefined) {
    const episodios = await getCollection('episodios');
    let targetEp;

    if (query) {
        targetEp = episodios.find(ep => ep.data.title.toLowerCase().includes(query.toLowerCase()));
    } else {
        targetEp = episodios.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())[0];
    }

    if (!targetEp || !targetEp.data.audioUrl) {
        return {
            version: '1.0',
            response: {
                outputSpeech: {
                    type: 'PlainText',
                    text: 'Lo siento, no he encontrado el audio de ese episodio.'
                },
                shouldEndSession: true
            }
        };
    }

    return {
        version: '1.0',
        response: {
            outputSpeech: {
                type: 'PlainText',
                text: `Reproduciendo ${targetEp.data.title}`
            },
            directives: [
                {
                    type: 'AudioPlayer.Play',
                    playBehavior: 'REPLACE_ALL',
                    audioItem: {
                        stream: {
                            url: targetEp.data.audioUrl,
                            token: targetEp.slug,
                            offsetInMilliseconds: 0
                        },
                        metadata: {
                            title: targetEp.data.title,
                            subtitle: 'Veredillas FM',
                            art: {
                                sources: [
                                    {
                                        url: targetEp.data.image || 'https://veredillas.fm/logo.png'
                                    }
                                ]
                            }
                        }
                    }
                }
            ],
            shouldEndSession: true
        }
    };
}

function handleHelpIntent() {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: 'Puedes decirme: pon el último episodio, o busca un episodio sobre algún tema.'
      },
      shouldEndSession: false
    }
  };
}

function handleCancelIntent() {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: 'Hasta luego, gracias por escuchar Veredillas FM.'
      },
      shouldEndSession: true
    }
  };
}

function handleFallbackIntent() {
  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: 'No estoy seguro de cómo ayudarte con eso. Prueba a pedir el último episodio.'
      },
      shouldEndSession: false
    }
  };
}
