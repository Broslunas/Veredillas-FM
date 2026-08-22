/**
 * renderSatori — server-only adapter turning a composeCardTree() output into a PNG via
 * Satori (JSX→SVG) + resvg (SVG→PNG). This is the whole reason composeCardTree stays pure/
 * synchronous with plain URL strings: this file does the async, Node-only work (font fetch,
 * sharp resize, base64 encoding) as a separate pass over the already-built tree.
 *
 * Do not import this from anything that runs in the browser — it pulls in `sharp` and
 * `node:fs`.
 */

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

import type { CardModel, CardNode, CardNodeStyle, Look } from './types';
import { FORMAT_DIMENSIONS } from './types';
import { composeCardTree } from './composeCard';

// ──────────────────────────────────────────────
// Asset loading — ported from api/episodes/story.ts, unchanged behavior.
// ──────────────────────────────────────────────

export const fetchFont = async (weight: number = 400): Promise<ArrayBuffer> => {
  try {
    const url =
      weight >= 700
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

export const loadImage = async (
  imagePath: string,
  width: number,
  height: number,
  blurRadius?: number
): Promise<string | null> => {
  try {
    if (!imagePath) return null;

    let buffer: ArrayBuffer | Buffer;
    if (imagePath.startsWith('http')) {
      const response = await fetch(imagePath, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
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
    if (blurRadius) pipeline = pipeline.blur(blurRadius);

    const pngBuffer = await pipeline.toFormat('png').toBuffer();
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (e) {
    console.error(`Failed to load story image: ${imagePath}`, e);
    return null;
  }
};

// ──────────────────────────────────────────────
// Effect normalization — Satori has no backdrop-filter, no @keyframes, no CSS filter on
// <img>. Each 'effect' marker gets a Satori-safe concrete substitute here, matching the
// DOM renderer's visual intent as closely as Satori's CSS subset allows.
// ──────────────────────────────────────────────

function normalizeEffectsForSatori(node: CardNode): CardNode {
  const cloned: CardNode = { ...node, props: { ...node.props } };
  const style: CardNodeStyle = { ...(cloned.props.style || {}) };

  if (cloned.effect === 'frostedGlass') {
    style.background = 'rgba(255,255,255,0.08)';
    style.border = '1.5px solid rgba(255,255,255,0.15)';
    delete style.backdropFilter;
    cloned.props.style = style;
  } else if (cloned.effect === 'audioWave') {
    // No CSS animation support — render as static bars with varied heights instead of the
    // DOM renderer's pulsing @keyframes.
    const staticHeights = [30, 55, 40, 65, 35, 50];
    cloned.props.children = (cloned.props.children || []).map((child, i) => ({
      ...child,
      props: {
        ...child.props,
        style: {
          ...(child.props.style || {}),
          position: 'absolute',
          bottom: 0,
          left: `${8 + i * 15}%`,
          width: '6%',
          height: `${staticHeights[i % staticHeights.length]}%`,
          opacity: 0.35,
          borderRadius: '999px 999px 0 0',
        },
      },
    }));
  }
  // 'blurredCover' is handled during image resolution (baked into the raster via sharp),
  // not here — see resolveImagesInPlace.

  if (cloned.props.children) {
    cloned.props.children = cloned.props.children.map(normalizeEffectsForSatori);
  }

  return cloned;
}

// ──────────────────────────────────────────────
// Image resolution — walks the tree fetching + resizing every <img> src to a base64 data
// URI (Satori cannot fetch remote images itself, and requires explicit numeric width/height
// on every <img> node).
// ──────────────────────────────────────────────

function numericStyleValue(value: CardNodeStyle[string]): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

async function resolveImagesInPlace(node: CardNode): Promise<CardNode> {
  const cloned: CardNode = { ...node, props: { ...node.props } };

  if (cloned.type === 'img' && cloned.props.src) {
    const style = cloned.props.style || {};
    const width = numericStyleValue(style.width) ?? numericStyleValue(style.maxWidth) ?? 1080;
    const height =
      numericStyleValue(style.height) ?? numericStyleValue(style.maxHeight) ?? Math.round(width * 0.75);
    const blur = cloned.effect === 'blurredCover' ? 100 : undefined;

    const dataUri = await loadImage(cloned.props.src, width, height, blur);
    cloned.props.src = dataUri || undefined;
    (cloned.props as Record<string, unknown>).width = width;
    (cloned.props as Record<string, unknown>).height = height;

    if (cloned.effect === 'blurredCover') {
      // The blur is already baked into the raster by sharp — drop the CSS filter/transform
      // that DOM used, since Satori doesn't support either on <img>.
      cloned.props.style = { ...style, filter: undefined, transform: undefined };
    }
  }

  if (cloned.props.children) {
    cloned.props.children = await Promise.all(cloned.props.children.map(resolveImagesInPlace));
  }

  return cloned;
}

// ──────────────────────────────────────────────
// CardNode → Satori JSX-shaped node.
// ──────────────────────────────────────────────

export function toSatoriNode(node: CardNode): unknown {
  const props: Record<string, unknown> = { style: node.props.style || {} };

  if (node.type === 'img') {
    props.src = node.props.src;
    props.width = (node.props as Record<string, unknown>).width;
    props.height = (node.props as Record<string, unknown>).height;
  } else if (node.props.text !== undefined) {
    props.children = node.props.text;
  } else {
    props.children = (node.props.children || []).map(toSatoriNode);
  }

  return { type: node.type, props };
}

// ──────────────────────────────────────────────
// High-level entry point used by api/episodes/story.ts.
// ──────────────────────────────────────────────

export async function renderCardPng(model: CardModel, look: Look): Promise<Buffer> {
  const { width, height } = FORMAT_DIMENSIONS[model.format];

  const rawTree = composeCardTree(model, look);
  const normalizedTree = normalizeEffectsForSatori(rawTree);
  const resolvedTree = await resolveImagesInPlace(normalizedTree);
  const satoriTree = toSatoriNode(resolvedTree);

  const [fontRegular, fontBold] = await Promise.all([fetchFont(400), fetchFont(700)]);

  const svg = await satori(satoriTree as never, {
    width,
    height,
    fonts: [
      { name: 'Outfit', data: fontRegular, style: 'normal' as const, weight: 400 as const },
      { name: 'Outfit', data: fontBold, style: 'normal' as const, weight: 700 as const },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width' as const, value: width } });
  return Buffer.from(resvg.render().asPng());
}
