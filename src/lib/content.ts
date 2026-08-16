import React from 'react';
import { marked } from 'marked';
import dbConnect from '@/lib/mongodb';
import EpisodeContent from '@/models/EpisodeContent';
import BlogPost from '@/models/BlogPost';
import Guest from '@/models/Guest';
import GalleryCategory from '@/models/GalleryCategory';

export interface ContentEntry<T = any> {
  id: string;
  slug: string;
  body: string;
  collection: string;
  data: T;
  render: () => Promise<{
    Content: React.ComponentType;
    headings: any[];
  }>;
}

export type CollectionEntry<T extends string = any> = ContentEntry;

function formatEntry(collection: string, doc: any): ContentEntry {
  const plain = doc.toObject ? doc.toObject() : doc;
  const { slug, body, _id, createdAt, updatedAt, __v, ...dataFields } = plain;

  if (dataFields.pubDate) {
    dataFields.pubDate = new Date(dataFields.pubDate);
  }

  if (collection === 'episodios' && Array.isArray(dataFields.dubs)) {
    dataFields.dubs = dataFields.dubs
      .filter((d: any) => d.status === 'ready' && d.url)
      .map((d: any) => ({ lang: d.lang, label: d.label, url: d.url }));
  }

  const markdownBody = body || '';

  return {
    id: slug,
    slug: slug,
    body: markdownBody,
    collection,
    data: dataFields,
    render: async () => {
      const htmlContent = marked.parse(markdownBody) as string;
      const Content: React.FC = () =>
        React.createElement('div', {
          className: 'markdown-content content-body',
          dangerouslySetInnerHTML: { __html: htmlContent },
        });

      return {
        Content,
        headings: [],
      };
    },
  };
}

export interface CollectionQueryOptions {
  // Only relevant for 'episodios' — internal admin views need to see drafts.
  includeDrafts?: boolean;
  // Relevant for 'episodios' | 'blog' | 'guests' — internal admin views
  // need to see items sitting in the panel's trash.
  includeDeleted?: boolean;
  // 'episodios' only. Listing/nav views (home, header, related episodes...)
  // never render the transcript, quiz or per-segment dubbing data — only the
  // single-episode page does, via getEntry. Fetching those fields on every
  // listing query got expensive as dubbing segments (translated text + timing
  // per chunk, per language) piled up on real episodes, so they're excluded
  // by default; opt in only where the data is actually used (search index,
  // speaker-time stats).
  includeHeavyFields?: boolean;
}

// Fields only needed by the single-episode player/detail view.
const EPISODE_LIGHT_EXCLUDE = '-transcription -quiz -dubs.segments';

// Short-lived cache so the same query fired from several components on one
// page (Header + home + FeaturedSlider all ask for 'episodios') — or from
// consecutive pages during a static build — hits Mongo once instead of once
// per caller.
interface CacheEntry {
  data: ContentEntry[];
  expires: number;
}
const collectionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000;

export async function getCollection(
  collection: 'episodios' | 'blog' | 'guests' | 'gallery' | string,
  filterFn?: (entry: ContentEntry) => boolean,
  options: CollectionQueryOptions = {}
): Promise<ContentEntry[]> {
  const cacheKey = `${collection}:${options.includeDrafts ? 1 : 0}:${options.includeDeleted ? 1 : 0}:${options.includeHeavyFields ? 1 : 0}`;
  const cached = collectionCache.get(cacheKey);

  let formatted: ContentEntry[];
  if (cached && cached.expires > Date.now()) {
    formatted = cached.data;
  } else {
    await dbConnect();

    let docs: any[] = [];

    switch (collection) {
      case 'episodios': {
        const query: any = {};
        if (!options.includeDeleted) query.deletedAt = null;
        if (!options.includeDrafts) query.status = { $ne: 'draft' };
        let q = EpisodeContent.find(query).sort({ pubDate: -1 });
        if (!options.includeHeavyFields) q = q.select(EPISODE_LIGHT_EXCLUDE);
        docs = await q.lean();
        break;
      }
      case 'blog': {
        const query: any = {};
        if (!options.includeDeleted) query.deletedAt = null;
        docs = await BlogPost.find(query).sort({ pubDate: -1 }).lean();
        break;
      }
      case 'guests': {
        const query: any = {};
        if (!options.includeDeleted) query.deletedAt = null;
        docs = await Guest.find(query).lean();
        break;
      }
      case 'gallery':
        docs = await GalleryCategory.find({}).lean();
        break;
      default:
        docs = [];
    }

    formatted = docs.map((d) => formatEntry(collection, d));
    collectionCache.set(cacheKey, { data: formatted, expires: Date.now() + CACHE_TTL_MS });
  }

  // Return a fresh array — callers sort/mutate the result in place and
  // shouldn't corrupt the cached copy shared with other callers.
  const result = formatted.slice();
  return filterFn ? result.filter(filterFn) : result;
}

export async function getEntry(
  collection: 'episodios' | 'blog' | 'guests' | 'gallery' | string,
  slug: string,
  options: CollectionQueryOptions = {}
): Promise<ContentEntry | null> {
  await dbConnect();

  let doc: any = null;

  switch (collection) {
    case 'episodios': {
      const query: any = { slug };
      if (!options.includeDeleted) query.deletedAt = null;
      if (!options.includeDrafts) query.status = { $ne: 'draft' };
      doc = await EpisodeContent.findOne(query).lean();
      break;
    }
    case 'blog': {
      const query: any = { slug };
      if (!options.includeDeleted) query.deletedAt = null;
      doc = await BlogPost.findOne(query).lean();
      break;
    }
    case 'guests': {
      const query: any = { slug };
      if (!options.includeDeleted) query.deletedAt = null;
      doc = await Guest.findOne(query).lean();
      break;
    }
    case 'gallery':
      doc = await GalleryCategory.findOne({ slug }).lean();
      break;
  }

  if (!doc) {
    return null;
  }

  return formatEntry(collection, doc);
}

export async function getEntries(
  entries: Array<{ collection: string; slug: string } | string>,
  collection?: string
): Promise<ContentEntry[]> {
  const result: ContentEntry[] = [];
  for (const item of entries) {
    if (typeof item === 'string') {
      if (collection) {
        const entry = await getEntry(collection, item);
        if (entry) result.push(entry);
      }
    } else if (item && item.collection && item.slug) {
      const entry = await getEntry(item.collection, item.slug);
      if (entry) result.push(entry);
    }
  }
  return result;
}
