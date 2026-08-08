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

export async function getCollection(
  collection: 'episodios' | 'blog' | 'guests' | 'gallery' | string,
  filterFn?: (entry: ContentEntry) => boolean
): Promise<ContentEntry[]> {
  await dbConnect();

  let docs: any[] = [];

  switch (collection) {
    case 'episodios':
      docs = await EpisodeContent.find({}).sort({ pubDate: -1 });
      break;
    case 'blog':
      docs = await BlogPost.find({}).sort({ pubDate: -1 });
      break;
    case 'guests':
      docs = await Guest.find({});
      break;
    case 'gallery':
      docs = await GalleryCategory.find({});
      break;
    default:
      docs = [];
  }

  let formatted = docs.map((d) => formatEntry(collection, d));

  if (filterFn) {
    formatted = formatted.filter(filterFn);
  }

  return formatted;
}

export async function getEntry(
  collection: 'episodios' | 'blog' | 'guests' | 'gallery' | string,
  slug: string
): Promise<ContentEntry | null> {
  await dbConnect();

  let doc: any = null;

  switch (collection) {
    case 'episodios':
      doc = await EpisodeContent.findOne({ slug });
      break;
    case 'blog':
      doc = await BlogPost.findOne({ slug });
      break;
    case 'guests':
      doc = await Guest.findOne({ slug });
      break;
    case 'gallery':
      doc = await GalleryCategory.findOne({ slug });
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
