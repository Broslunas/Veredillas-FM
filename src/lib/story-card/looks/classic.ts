/**
 * "Classic" Look — the original visual identity of the Story Creator.
 */

import type { Look, CardElementLayout } from '../types';
import { makeDefaultElementLayout } from '../types';

const storyLayout: CardElementLayout = makeDefaultElementLayout();

const postLayout: CardElementLayout = {
  ...makeDefaultElementLayout(),
  cover: { x: 0, y: -40, scale: 0.85, align: 'left', visible: true },
  title: { x: 0, y: 20, scale: 0.9, align: 'left', visible: true },
  tag: { x: 0, y: 0, scale: 0.9, align: 'left', visible: true },
  logo: { x: 0, y: 0, scale: 0.9, align: 'left', visible: true },
  guest: { x: 0, y: 15, scale: 0.9, align: 'left', visible: true },
  quote: { x: 0, y: 20, scale: 0.85, align: 'left', visible: false },
  website: { x: 0, y: 0, scale: 0.9, align: 'left', visible: true },
  qr: { x: 0, y: 0, scale: 0.85, align: 'left', visible: false },
};

export const classic: Look = {
  id: 'classic',
  name: 'Clásico',
  previewGradient: ['#8b5cf6', '#ec4899'],
  background: { kind: 'cover', blur: 100, brightness: 0.4 },
  accentDefault: '#8b5cf6',
  titleTypography: {
    fontFamily: 'Outfit',
    weight: 900,
    sizePx: { story: 85, post: 64 },
    letterSpacing: '-0.02em',
  },
  bodyTypography: {
    fontFamily: 'Outfit',
    weight: 600,
    sizePx: { story: 42, post: 32 },
  },
  decorations: ['wave'],
  defaultLayout: {
    story: storyLayout,
    post: postLayout,
  },
};
