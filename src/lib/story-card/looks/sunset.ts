/**
 * "Sunset" Look — warm, vibrant gradient look.
 * Pink/orange sunset glow, clean modern sans typography, centered hero composition.
 */

import type { Look, CardElementLayout } from '../types';
import { makeDefaultElementLayout } from '../types';

const storyLayout: CardElementLayout = {
  ...makeDefaultElementLayout(),
  cover: { x: 0, y: -40, scale: 0.95, align: 'center', visible: true },
  title: { x: 0, y: -20, scale: 1.05, align: 'center', visible: true },
  tag: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  logo: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  guest: { x: 0, y: 0, scale: 1, align: 'center', visible: true },
  quote: { x: 0, y: 0, scale: 1, align: 'center', visible: false },
  website: { x: 0, y: 0, scale: 1, align: 'left', visible: true },
  qr: { x: 0, y: 0, scale: 1, align: 'left', visible: false },
};

export const sunset: Look = {
  id: 'sunset',
  name: 'Sunset Glow',
  previewGradient: ['#f97316', '#db2777'],
  background: { kind: 'gradient', from: '#1a0b2e', to: '#4a0e2e', angle: 135 },
  accentDefault: '#f97316',
  titleTypography: {
    fontFamily: 'Outfit',
    weight: 900,
    sizePx: { story: 90, post: 70 },
    letterSpacing: '-0.02em',
  },
  bodyTypography: {
    fontFamily: 'Outfit',
    weight: 600,
    sizePx: { story: 42, post: 34 },
  },
  decorations: ['wave'],
  defaultLayout: {
    story: storyLayout,
    post: makeDefaultElementLayout(),
  },
};
