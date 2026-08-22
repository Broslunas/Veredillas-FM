/**
 * "Midnight" Look — high-contrast modern dark mode.
 * Sharp typography (Space Grotesk), deep blacks, cyan neon accents, minimalist layout.
 */

import type { Look, CardElementLayout } from '../types';
import { makeDefaultElementLayout } from '../types';

const storyLayout: CardElementLayout = {
  ...makeDefaultElementLayout(),
  cover: { x: 0, y: -60, scale: 1.05, align: 'left', visible: true },
  title: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  tag: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  logo: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  guest: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  quote: { x: 0, y: 0, scale: 1, align: 'left', visible: false },
  website: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  qr: { x: 0, y: 0, scale: 1, align: 'left', visible: false },
};

export const midnight: Look = {
  id: 'midnight',
  name: 'Midnight',
  previewGradient: ['#09090b', '#06b6d4'],
  background: { kind: 'gradient', from: '#050508', to: '#0f172a', angle: 180 },
  accentDefault: '#06b6d4',
  titleTypography: {
    fontFamily: 'Space Grotesk',
    weight: 700,
    sizePx: { story: 88, post: 68 },
    letterSpacing: '-0.03em',
  },
  bodyTypography: {
    fontFamily: 'Outfit',
    weight: 600,
    sizePx: { story: 38, post: 32 },
  },
  decorations: ['wave'],
  defaultLayout: {
    story: storyLayout,
    post: makeDefaultElementLayout(),
  },
};
