import mongoose, { Schema } from 'mongoose';

export interface ITranscriptionItem {
  time: string;
  text: string;
  speaker?: string;
}

export interface ISectionItem {
  title: string;
  time: string;
}

export interface IClipItem {
  title: string;
  url: string;
}

export interface IQuizItem {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface IEpisodeContent {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
  author: string;
  image?: string;
  spotifyUrl?: string;
  audioUrl?: string;
  duration?: string;
  season?: number;
  episode?: number;
  videoUrl?: string;
  tags: string[];
  participants?: string[];
  isPremiere: boolean;
  transcription?: ITranscriptionItem[];
  sections?: ISectionItem[];
  warningMessage?: string;
  clips?: IClipItem[];
  quiz?: IQuizItem[];
  body: string;
  status: 'draft' | 'published';
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EpisodeContentSchema = new Schema<IEpisodeContent>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    pubDate: { type: Date, required: true },
    author: { type: String, default: 'Veredillas FM' },
    image: { type: String },
    spotifyUrl: { type: String },
    audioUrl: { type: String },
    duration: { type: String },
    season: { type: Number },
    episode: { type: Number },
    videoUrl: { type: String },
    tags: { type: [String], default: ['General'] },
    participants: { type: [String] },
    isPremiere: { type: Boolean, default: false },
    transcription: [
      {
        time: { type: String, required: true },
        text: { type: String, required: true },
        speaker: { type: String },
      },
    ],
    sections: [
      {
        title: { type: String, required: true },
        time: { type: String, required: true },
      },
    ],
    warningMessage: { type: String },
    clips: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    quiz: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswer: { type: Number, required: true },
      },
    ],
    body: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

if (mongoose.models.EpisodeContent) {
  delete mongoose.models.EpisodeContent;
}

const EpisodeContent = mongoose.model<IEpisodeContent>('EpisodeContent', EpisodeContentSchema);

export default EpisodeContent;
