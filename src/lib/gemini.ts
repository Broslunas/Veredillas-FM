/**
 * Gemini API Helper Utilities for Veredillas FM Web
 * Port de veredillas-fm-panel/lib/gemini.ts adaptado a Astro (import.meta.env).
 */

const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = import.meta.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiGenerationOptions {
  model?: string;
  temperature?: number;
  responseSchema?: Record<string, any>;
}

export async function callGemini(prompt: string, options: GeminiGenerationOptions = {}): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta configurar GEMINI_API_KEY en las variables de entorno');
  }

  const model = options.model || GEMINI_MODEL;

  const generationConfig: Record<string, any> = {
    temperature: options.temperature ?? 0.7,
  };

  if (options.responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = options.responseSchema;
  }

  let res = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
    }
  );

  // Fallback si el modelo da 404
  if (res.status === 404 && model !== GEMINI_MODEL) {
    res = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
      }
    );
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini bloqueó la generación (${blockReason})`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => p.text || '').join('');

  if (!text) {
    throw new Error('Gemini no ha devuelto contenido.');
  }

  return text;
}

export interface SuggestedQuote {
  quote: string;
  speaker?: string;
  time?: string;
}

const QUOTES_SCHEMA = {
  type: 'object',
  properties: {
    quotes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          speaker: { type: 'string' },
          time: { type: 'string' },
        },
        required: ['quote'],
      },
    },
  },
  required: ['quotes'],
};

const MAX_TRANSCRIPT_CHARS = 24000;

export async function suggestQuotesFromTranscript(
  title: string,
  transcription: { time: string; text: string; speaker?: string }[]
): Promise<SuggestedQuote[]> {
  const transcriptText = transcription
    .filter((t) => t && t.text && t.text.trim())
    .map((t) => `[${t.time}]${t.speaker ? ` ${t.speaker}:` : ''} ${t.text.trim()}`)
    .join('\n')
    .slice(0, MAX_TRANSCRIPT_CHARS);

  if (!transcriptText) {
    throw new Error('El episodio no tiene transcripción para extraer citas.');
  }

  const prompt = `Eres el editor de contenidos de Veredillas FM, una radio online en español dirigida a un público joven.
Analiza la siguiente transcripción del episodio "${title}" y selecciona entre 2 y 4 citas memorables, impactantes o divertidas para compartir en Instagram Stories.

Requisitos estrictos:
- Las frases deben ser TEXTUALES o adaptadas mínimamente de lo que realmente se dice en la transcripción.
- Longitud ideal de cada cita: entre 10 y 25 palabras (impactante, concisa y legible en una Story).
- Incluye el nombre del hablante si se identifica y la marca de tiempo aproximada.

Transcripción:
${transcriptText}

Responde únicamente con el JSON solicitado en español:
{"quotes": [{"quote": "...", "speaker": "...", "time": "mm:ss"}]}`;

  const text = await callGemini(prompt, { responseSchema: QUOTES_SCHEMA, temperature: 0.6 });
  const parsed = JSON.parse(text);

  return Array.isArray(parsed.quotes) ? parsed.quotes.filter((q: any) => q && q.quote) : [];
}
