import mongoose, { Schema } from 'mongoose';

export interface IGuestSocial {
  twitter?: string;
  instagram?: string;
  website?: string;
}

export interface IGuest {
  slug: string;
  name: string;
  image?: string;
  role?: string;
  description?: string;
  social?: IGuestSocial;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const GuestSchema = new Schema<IGuest>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    image: { type: String },
    role: { type: String },
    description: { type: String },
    social: {
      twitter: { type: String },
      instagram: { type: String },
      website: { type: String },
    },
    body: { type: String, default: '' },
  },
  { timestamps: true }
);

if (mongoose.models.Guest) {
  delete mongoose.models.Guest;
}

const Guest = mongoose.model<IGuest>('Guest', GuestSchema);

export default Guest;
