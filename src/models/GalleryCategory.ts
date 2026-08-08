import mongoose, { Schema } from 'mongoose';

export interface IGalleryImage {
  title: string;
  src: string;
  type: 'image' | 'video';
  thumbnail?: string;
  featured: boolean;
}

export interface IGalleryCategory {
  slug: string;
  category: string;
  images: IGalleryImage[];
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const GalleryCategorySchema = new Schema<IGalleryCategory>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    images: [
      {
        title: { type: String, required: true },
        src: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], default: 'image' },
        thumbnail: { type: String },
        featured: { type: Boolean, default: false },
      },
    ],
    body: { type: String, default: '' },
  },
  { timestamps: true }
);

if (mongoose.models.GalleryCategory) {
  delete mongoose.models.GalleryCategory;
}

const GalleryCategory = mongoose.model<IGalleryCategory>('GalleryCategory', GalleryCategorySchema);

export default GalleryCategory;
