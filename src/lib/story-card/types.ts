/**
 * Story Card engine — shared types.
 *
 * This module is the single source of truth for the "shareable card" that used to be
 * duplicated by hand across ShareCardGenerator.astro (editor DOM), ep/share-qr/[id].astro
 * (mobile QR flow) and api/episodes/story.ts (server-side Satori render).
 *
 * Pure TS, no Astro/DOM/Node imports here — this file must be safe to import from both
 * the browser (editor, share-qr page) and the server (the Satori API route).
 */

export type CardFormat = 'story' | 'post';

/** Pixel dimensions for each supported export format. */
export const FORMAT_DIMENSIONS: Record<CardFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1080 },
};

export type ElementId =
  | 'logo'
  | 'tag'
  | 'cover'
  | 'title'
  | 'guest'
  | 'quote'
  | 'website'
  | 'qr';

export type TextAlign = 'left' | 'center' | 'right';

/** Per-element user-adjustable transform, driven by the editor's drag/zoom/align UI. */
export interface CardElementState {
  x: number;
  y: number;
  scale: number;
  align: TextAlign;
  visible: boolean;
}

export type CardElementLayout = Record<ElementId, CardElementState>;

export interface CardTypography {
  fontFamily: string;
  /** Google Fonts / self-hosted family used for weights >= 700. Usually same as fontFamily. */
  weight: number;
  /** Font size in px, indexed by format since a Post needs different scale than a Story. */
  sizePx: Partial<Record<CardFormat, number>>;
  letterSpacing?: string;
}

export type CardBackgroundSpec =
  | { kind: 'cover'; blur: number; brightness: number }
  | { kind: 'image'; url: string; blur?: number; brightness?: number }
  | { kind: 'gradient'; from: string; to: string; angle: number }
  | { kind: 'solid'; color: string };

/**
 * A "Look" is pure data: a declarative visual identity (typography, background defaults,
 * decorations, default per-format layout). Adding a new Look to the app is adding a new
 * file under looks/*.ts — never touching the compose/render engine itself.
 */
export interface Look {
  id: string;
  name: string;
  /** Small swatch/preview shown in the Look picker. */
  previewGradient: [string, string];
  background: CardBackgroundSpec;
  accentDefault: string;
  titleTypography: CardTypography;
  bodyTypography: CardTypography;
  /** Purely cosmetic flourishes. 'wave' = animated audio bars decoration behind the content. */
  decorations: Array<'wave'>;
  /** Default element positions/scale/alignment/visibility, per export format. */
  defaultLayout: Record<CardFormat, CardElementLayout>;
}

/**
 * A concrete card instance: the user's content + chosen Look + any manual overrides,
 * everything needed to reproduce the exact same image via either renderer.
 */
export interface CardModel {
  lookId: string;
  format: CardFormat;
  accent: string;
  title: string;
  guests: string;
  quote: string;
  background: CardBackgroundSpec;
  /** Custom typography override for title */
  fontFamily?: string;
  /** Custom title font size override */
  titleFontSize?: number;
  /** Custom quote font size override */
  quoteFontSize?: number;
  /** Episode cover image (or a user-uploaded custom image, from Fase 3 onward). */
  coverImageUrl: string;
  websiteLabel: string;
  /** User override for the Look's 'wave' decoration. Undefined = follow the Look default. */
  showWave?: boolean;
  elements: CardElementLayout;
}

/**
 * Intermediate render tree, shaped like a Satori node (`{type, props:{style, children}}`)
 * so `renderSatori.ts` is close to identity. `renderDom.ts` mounts the same tree as real DOM.
 *
 * `effect` marks a node whose concrete styling must diverge per renderer because Satori
 * lacks backdrop-filter/@keyframes/Grid (e.g. DOM gets a real blurred glass panel + CSS
 * animation, Satori gets a flat rgba background + static bar heights). Declared once per
 * Look via composeCardTree, never re-implemented per consumer.
 */
export type CardNodeEffect = 'frostedGlass' | 'blurredCover' | 'audioWave';

export type CardNodeStyle = Record<string, string | number | undefined>;

export interface CardNode {
  type: 'div' | 'img' | 'span' | 'p' | 'h1';
  /** ElementId for draggable nodes, a structural label otherwise. Carried through for renderDom's data-drag-id. */
  id?: ElementId | string;
  effect?: CardNodeEffect;
  props: {
    style?: CardNodeStyle;
    /** Plain URL string — renderDom hands it straight to <img src>, renderSatori resolves it to a data URI. */
    src?: string;
    text?: string;
    children?: CardNode[];
  };
}

export function makeDefaultElementLayout(): CardElementLayout {
  const base: CardElementState = { x: 0, y: 0, scale: 1, align: 'left', visible: true };
  return {
    logo: { ...base },
    tag: { ...base },
    cover: { ...base },
    title: { ...base },
    guest: { ...base },
    quote: { ...base, visible: false },
    website: { ...base },
    qr: { ...base, visible: false },
  };
}
