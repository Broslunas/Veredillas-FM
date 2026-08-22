/**
 * legacy.ts — translates a v1 ShareDesign document (the one-letter-field shape saved by the
 * pre-engine editor: `{t,g,q,c,b,bc,img,u,es,v}`) into a v2 CardModel, so QR links and emails
 * shared before this migration keep resolving to the same image.
 *
 * v1 field map (see the old getShortId() in ShareCardGenerator.astro):
 *   t=title, g=guests, q=quote, c=accent, b=background preset id, bc=solid bg color,
 *   img=cover image, u=episode url, es=per-element {x,y,s,align}, v=visibility toggles.
 */

import type { CardBackgroundSpec, CardElementLayout, CardElementState, CardModel, ElementId, TextAlign } from './types';
import { makeDefaultElementLayout } from './types';

interface LegacyElementState {
  x: number;
  y: number;
  s: number;
  align: TextAlign;
}

interface LegacyVisibility {
  l?: boolean; // logo
  w?: boolean; // website
  wv?: boolean; // wave decoration
  q?: boolean; // qr
  cv?: boolean; // cover
}

export interface LegacyShareData {
  t: string;
  g?: string;
  q?: string;
  c?: string;
  b?: string;
  bc?: string;
  img?: string;
  u?: string;
  es?: Record<string, LegacyElementState>;
  v?: LegacyVisibility;
}

const GRADIENT_PRESETS: Record<string, { from: string; to: string; angle: number }> = {
  'gradient-aurora': { from: '#1e3a8a', to: '#a21caf', angle: 135 },
  'gradient-sunset': { from: '#f97316', to: '#db2777', angle: 135 },
  'gradient-midnight': { from: '#09090b', to: '#18181b', angle: 0 },
};

function mapBackground(b: string | undefined, bc: string | undefined): CardBackgroundSpec {
  if (b && GRADIENT_PRESETS[b]) {
    return { kind: 'gradient', ...GRADIENT_PRESETS[b] };
  }
  if (b === 'solid') {
    return { kind: 'solid', color: bc || '#0f0f0f' };
  }
  // 'cover' (default) and any unrecognized value fall back to the blurred-episode-image look.
  return { kind: 'cover', blur: 100, brightness: 0.4 };
}

// Elements that never had a toggle in v1 — always shown, matching old behavior.
const ALWAYS_VISIBLE: ElementId[] = ['title', 'tag'];

function mapVisibility(id: ElementId, v: LegacyVisibility | undefined, hasContent: boolean): boolean {
  if (ALWAYS_VISIBLE.includes(id)) return true;
  switch (id) {
    case 'logo':
      return v?.l ?? true;
    case 'website':
      return v?.w ?? true;
    case 'qr':
      return v?.q ?? false;
    case 'cover':
      return v?.cv ?? true;
    case 'quote':
    case 'guest':
      // v1 had no explicit toggle for these — they showed whenever the field had content.
      return hasContent;
    default:
      return true;
  }
}

function mapElements(data: LegacyShareData): CardElementLayout {
  const layout = makeDefaultElementLayout();
  const es = data.es || {};

  (Object.keys(layout) as ElementId[]).forEach((id) => {
    const legacy = es[id];
    const hasContent = id === 'quote' ? !!data.q?.trim() : id === 'guest' ? !!data.g?.trim() : true;
    const state: CardElementState = legacy
      ? { x: legacy.x, y: legacy.y, scale: legacy.s, align: legacy.align, visible: mapVisibility(id, data.v, hasContent) }
      : { ...layout[id], visible: mapVisibility(id, data.v, hasContent) };
    layout[id] = state;
  });

  return layout;
}

/** Migrates a v1 ShareDesign.data payload into a v2 CardModel, anchored to the 'classic' Look
 *  since that was the only Look that existed when these designs were saved. */
export function migrateLegacyDesign(data: LegacyShareData): CardModel {
  return {
    lookId: 'classic',
    format: 'story',
    accent: data.c || '#8b5cf6',
    title: data.t || '',
    guests: data.g || '',
    quote: data.q || '',
    background: mapBackground(data.b, data.bc),
    coverImageUrl: data.img || '/logo.webp',
    websiteLabel: data.u || 'veredillasfm.es',
    showWave: data.v?.wv ?? true,
    elements: mapElements(data),
  };
}
