/**
 * renderDom — mounts a CardNode tree (from composeCardTree) into real DOM.
 *
 * Used by the editor (drag/zoom UI operates on real elements) and by the share-qr page
 * (renders once, then rasterizes via html-to-image). Browser-only: do not import from an
 * API route.
 */

import type { CardNode, CardNodeStyle, ElementId } from './types';

const DRAG_IDS: Set<string> = new Set<ElementId>([
  'logo',
  'tag',
  'cover',
  'title',
  'guest',
  'quote',
  'website',
  'qr',
]);

const WAVE_STYLE_ID = 'story-card-wave-style';

/** Injects the audio-wave decoration's @keyframes once per document. Satori can't do
 *  @keyframes at all — this is exactly the divergence the 'audioWave' effect marker exists
 *  to isolate to the DOM renderer only. */
function ensureWaveKeyframes(doc: Document) {
  if (doc.getElementById(WAVE_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = WAVE_STYLE_ID;
  style.textContent = `
    .story-card-wave-bar {
      position: absolute;
      bottom: 0;
      width: 6%;
      border-radius: 999px 999px 0 0;
      opacity: 0.35;
      animation: story-card-soundwave 2.4s ease-in-out infinite;
    }
    @keyframes story-card-soundwave {
      0%, 100% { height: 10%; }
      50% { height: 60%; }
    }
  `;
  doc.head.appendChild(style);
}

function applyStyle(el: HTMLElement, style?: CardNodeStyle) {
  if (!style) return;
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue;
    // @ts-expect-error - CSSStyleDeclaration is indexable by camelCase property name at runtime.
    el.style[key] = typeof value === 'number' && key !== 'flex' ? `${value}px` : String(value);
  }
}

function applyEffect(el: HTMLElement, effect: NonNullable<CardNode['effect']>) {
  switch (effect) {
    case 'frostedGlass':
      // Reuses the site-wide glassmorphism pattern (see global .frosted-glass) rather than
      // re-declaring backdrop-filter here — renderSatori substitutes a flat rgba instead,
      // since Satori doesn't support backdrop-filter.
      el.classList.add('frosted-glass');
      break;
    case 'blurredCover':
      // The concrete filter/transform already comes through composeCardTree's inline style;
      // DOM supports CSS filter natively, so nothing extra needed here.
      break;
    case 'audioWave':
      ensureWaveKeyframes(el.ownerDocument);
      el.classList.add('story-card-wave-container');
      Array.from(el.children).forEach((child, i) => {
        const bar = child as HTMLElement;
        bar.classList.add('story-card-wave-bar');
        bar.style.left = `${8 + i * 15}%`;
        bar.style.animationDelay = `${i * 0.15}s`;
      });
      break;
  }
}

/** Recursively builds real DOM nodes from a CardNode tree. Image `src` is used as-is — the
 *  browser resolves it, no data-URI conversion needed here (that's renderSatori's job). */
export function mountCardTree(node: CardNode, doc: Document = document): HTMLElement {
  const el = doc.createElement(node.type === 'h1' ? 'h1' : node.type === 'img' ? 'img' : node.type === 'p' ? 'p' : node.type === 'span' ? 'span' : 'div');

  if (node.id && DRAG_IDS.has(node.id)) {
    el.setAttribute('data-drag-id', node.id);
  } else if (node.id) {
    el.setAttribute('data-node-id', node.id);
  }

  applyStyle(el, node.props.style);

  if (node.type === 'img' && node.props.src) {
    (el as HTMLImageElement).src = node.props.src;
  }

  if (node.props.text !== undefined) {
    el.textContent = node.props.text;
  }

  if (node.effect) {
    applyEffect(el, node.effect);
  }

  (node.props.children || []).forEach((child) => {
    el.appendChild(mountCardTree(child, doc));
  });

  return el;
}

/** Clears `container` and mounts a fresh CardNode tree into it. */
export function renderCardIntoDom(root: CardNode, container: HTMLElement) {
  container.innerHTML = '';
  container.appendChild(mountCardTree(root, container.ownerDocument));
}
