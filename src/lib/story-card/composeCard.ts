/**
 * composeCardTree — the single place that knows the visual structure of a Story/Post card.
 *
 * Pure and synchronous: takes a CardModel + its Look and returns a CardNode tree. Image
 * fields (`props.src`) stay as plain URL strings here — renderDom.ts feeds them straight to
 * <img src>, renderSatori.ts does the async fetch-to-data-URI pass afterwards. No Astro/DOM/
 * Node APIs, so this runs identically in the browser editor and on the server.
 */

import type { CardModel, CardNode, CardNodeStyle, ElementId, Look } from './types';
import { FORMAT_DIMENSIONS } from './types';
import { cleanEpisodeTitle } from './text';

const ALIGN_TO_FLEX: Record<'left' | 'center' | 'right', string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

/** Wraps a positioned child in the transform/align/visibility that the editor's drag UI controls. */
function positioned(model: CardModel, id: ElementId, node: CardNode): CardNode | null {
  const state = model.elements[id];
  if (!state || !state.visible) return null;
  const style: CardNodeStyle = {
    ...(node.props.style || {}),
    transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    textAlign: state.align,
    alignSelf: ALIGN_TO_FLEX[state.align],
  };
  return { ...node, id, props: { ...node.props, style } };
}

function buildBackground(model: CardModel): CardNode[] {
  const { width, height } = FORMAT_DIMENSIONS[model.format];
  const bg = model.background;
  const nodes: CardNode[] = [];

  if (bg.kind === 'cover' || bg.kind === 'image') {
    const src = bg.kind === 'image' ? bg.url : model.coverImageUrl;
    const blur = bg.kind === 'image' ? (bg.blur ?? 100) : bg.blur;
    const brightness = bg.kind === 'image' ? (bg.brightness ?? 0.4) : bg.brightness;
    nodes.push({
      type: 'img',
      id: 'bg-image',
      effect: 'blurredCover',
      props: {
        src,
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // Concrete filter/scale for renderers that support it (DOM). renderSatori's
          // 'blurredCover' handling substitutes a pre-blurred raster instead, since Satori
          // doesn't support CSS filter on <img>.
          filter: `blur(${blur}px) brightness(${brightness})`,
          transform: 'scale(1.3)',
        },
      },
    });
    nodes.push({
      type: 'div',
      id: 'bg-overlay',
      props: {
        style: {
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 0%, transparent 0%, rgba(0,0,0,0.8) 100%)',
        },
      },
    });
  } else if (bg.kind === 'gradient') {
    nodes.push({
      type: 'div',
      id: 'bg-gradient',
      props: {
        style: {
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${bg.angle}deg, ${bg.from} 0%, ${bg.to} 100%)`,
        },
      },
    });
  } else {
    nodes.push({
      type: 'div',
      id: 'bg-solid',
      props: { style: { position: 'absolute', inset: 0, background: bg.color } },
    });
  }

  const showWave = model.showWave ?? true;
  if (showWave) {
    nodes.push({
      type: 'div',
      id: 'audio-wave-decoration',
      effect: 'audioWave',
      props: {
        style: { position: 'absolute', inset: 0, pointerEvents: 'none' },
        children: Array.from({ length: 6 }, (_, i) => ({
          type: 'div' as const,
          props: { style: { background: model.accent } },
        })),
      },
    });
  }

  return nodes;
}

function buildTopBar(model: CardModel): CardNode {
  const children: CardNode[] = [];

  const logo = positioned(model, 'logo', {
    type: 'div',
    props: {
      style: { display: 'flex', alignItems: 'center', gap: '16px' },
      children: [
        { type: 'img', props: { src: '/logo.webp', style: { width: 64, height: 64, borderRadius: '50%' } } },
        { type: 'span', props: { text: 'VEREDILLAS FM', style: { fontWeight: 700, fontSize: 24, color: '#fff' } } },
      ],
    },
  });
  if (logo) children.push(logo);

  const tag = positioned(model, 'tag', {
    type: 'div',
    props: {
      style: {
        padding: '12px 28px',
        borderRadius: '999px',
        background: model.accent,
        color: '#fff',
        fontWeight: 700,
        fontSize: 22,
      },
      children: [{ type: 'span', props: { text: 'EN DIRECTO' } }],
    },
  });
  if (tag) children.push(tag);

  return {
    type: 'div',
    id: 'card-top-bar',
    props: {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
      children,
    },
  };
}

function buildMainVisual(model: CardModel, look: Look): CardNode {
  const cover = positioned(model, 'cover', {
    type: 'div',
    props: {
      style: { position: 'relative', display: 'flex', justifyContent: 'center' },
      children: [
        {
          type: 'div',
          effect: 'blurredCover',
          props: {
            style: {
              position: 'absolute',
              inset: 0,
              boxShadow: `0 0 100px 30px ${model.accent}66`,
            },
          },
        },
        {
          type: 'img',
          props: {
            src: model.coverImageUrl,
            style: { maxWidth: 1000, maxHeight: 1200, objectFit: 'contain', borderRadius: '24px' },
          },
        },
      ],
    },
  });

  const titleSize = model.titleFontSize ?? (look.titleTypography.sizePx[model.format] ?? 85);
  const titleFont = model.fontFamily || look.titleTypography.fontFamily;
  const title = positioned(model, 'title', {
    type: 'h1',
    props: {
      text: cleanEpisodeTitle(model.title),
      style: {
        fontFamily: titleFont,
        fontWeight: look.titleTypography.weight,
        fontSize: titleSize,
        lineHeight: 1.05,
        letterSpacing: look.titleTypography.letterSpacing,
        color: '#fff',
      },
    },
  });

  const guest = model.guests
    ? positioned(model, 'guest', {
        type: 'div',
        props: {
          style: { display: 'flex', flexDirection: 'column', gap: '4px' },
          children: [
            { type: 'span', props: { text: 'FEATURING', style: { fontSize: 22, opacity: 0.7, color: '#fff' } } },
            { type: 'span', props: { text: model.guests, style: { fontSize: 56, fontWeight: 800, color: '#fff' } } },
          ],
        },
      })
    : null;

  const bodySize = model.quoteFontSize ?? (look.bodyTypography.sizePx[model.format] ?? 42);
  const bodyFont = model.fontFamily || look.bodyTypography.fontFamily;
  const quote = model.quote
    ? positioned(model, 'quote', {
        type: 'div',
        effect: 'frostedGlass',
        props: {
          style: { padding: '50px', borderRadius: '40px' },
          children: [
            {
              type: 'p',
              props: {
                text: `“${model.quote}”`,
                style: {
                  fontFamily: bodyFont,
                  fontWeight: look.bodyTypography.weight,
                  fontSize: bodySize,
                  fontStyle: 'italic',
                  color: '#fff',
                },
              },
            },
          ],
        },
      })
    : null;

  const textContent: CardNode = {
    type: 'div',
    id: 'text-content',
    props: {
      style: { display: 'flex', flexDirection: 'column', gap: '24px' },
      children: [title, guest, quote].filter((n): n is CardNode => n !== null),
    },
  };

  return {
    type: 'div',
    id: 'main-visual',
    props: {
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', gap: '48px' },
      children: [cover, textContent].filter((n): n is CardNode => n !== null),
    },
  };
}

function buildFooter(model: CardModel): CardNode {
  const children: CardNode[] = [];

  const website = positioned(model, 'website', {
    type: 'div',
    props: {
      style: {
        padding: '16px 32px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.1)',
        color: '#fff',
        fontWeight: 600,
        fontSize: 24,
      },
      children: [{ type: 'span', props: { text: model.websiteLabel } }],
    },
  });
  if (website) children.push(website);

  const qr = positioned(model, 'qr', {
    type: 'div',
    id: 'qr-container-card',
    props: {
      style: { width: 120, height: 120, background: '#fff', borderRadius: '16px' },
    },
  });
  if (qr) children.push(qr);

  return {
    type: 'div',
    id: 'card-footer',
    props: {
      style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
      children,
    },
  };
}

export function composeCardTree(model: CardModel, look: Look): CardNode {
  const { width, height } = FORMAT_DIMENSIONS[model.format];

  return {
    type: 'div',
    id: 'share-card',
    props: {
      style: {
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        fontFamily: look.bodyTypography.fontFamily,
        background: '#0f0f0f',
      },
      children: [
        {
          type: 'div',
          id: 'card-bg',
          props: { style: { position: 'absolute', inset: 0 }, children: buildBackground(model) },
        },
        {
          type: 'div',
          id: 'card-content',
          props: {
            style: {
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '100%',
              height: '100%',
              padding: '120px 80px 100px 80px',
            },
            children: [buildTopBar(model), buildMainVisual(model, look), buildFooter(model)],
          },
        },
      ],
    },
  };
}
