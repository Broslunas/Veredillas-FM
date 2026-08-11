import mongoose, { Schema } from 'mongoose';

export interface IBlogPost {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  author: string;
  image?: string;
  tags?: string[];
  body: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    pubDate: { type: Date, required: true },
    author: { type: String, default: 'Redacción Veredillas' },
    image: { type: String },
    tags: { type: [String] },
    body: { type: String, default: '' },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

if (mongoose.models.BlogPost) {
  delete mongoose.models.BlogPost;
}

const BlogPost = mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);

export default BlogPost;
