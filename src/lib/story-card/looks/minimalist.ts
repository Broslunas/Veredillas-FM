/**
 * "Minimalist" Look — ultra clean, airy, elegant.
 * Ample negative space, muted accents, crisp typography, focus on text & quote.
 */

import type { Look, CardElementLayout } from '../types';
import { makeDefaultElementLayout } from '../types';

const storyLayout: CardElementLayout = {
  ...makeDefaultElementLayout(),
  cover: { x: 0, y: -200, scale: 0.65, align: 'center', visible: true },
  title: { x: 0, y: 40, scale: 1.15, align: 'center', visible: true },
  tag: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  logo: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  guest: { x: 0, y: 50, scale: 0.9, align: 'center', visible: true },
  quote: { x: 0, y: 60, scale: 1, align: 'center', visible: false },
  website: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  qr: { x: 0, y: 0, scale: 1, align: 'left', visible: false },
};

export const minimalist: Look = {
  id: 'minimalist',
  name: 'Minimalist',
  previewGradient: ['#18181b', '#71717a'],
  background: { kind: 'solid', color: '#09090b' },
  accentDefault: '#e4e4e7',
  titleTypography: {
    fontFamily: 'Outfit',
    weight: 700,
    sizePx: { story: 96, post: 74 },
    letterSpacing: '-0.03em',
  },
  bodyTypography: {
    fontFamily: 'Outfit',
    weight: 400,
    sizePx: { story: 40, post: 32 },
  },
  decorations: [],
  defaultLayout: {
    story: storyLayout,
    post: makeDefaultElementLayout(),
  },
};
