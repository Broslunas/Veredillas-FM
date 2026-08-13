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
  videoId?: string;
  thumbnailUrl?: string;
}

export interface IQuizItem {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface IDubSegment {
  index: number;
  start: number;
  end: number;
  speaker?: number;
  text: string;
  translatedText?: string;
  status: 'pending' | 'translated' | 'synthesized' | 'error';
  tempKey?: string;
  durationSeconds?: number;
  actualStart?: number;
  actualEnd?: number;
  error?: string;
}

export interface IDubTrack {
  lang: string;
  label: string;
  status: 'segmenting' | 'awaiting_voices' | 'translating' | 'synthesizing' | 'finalizing' | 'ready' | 'error';
  progress: number;
  sourceDuration?: number;
  segments: IDubSegment[];
  voiceMap: Record<string, string>;
  speakerNames?: Record<string, string>;
  maxDriftSeconds?: number;
  url?: string;
  bucket?: string;
  key?: string;
  duration?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
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
  dubs?: IDubTrack[];
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
        videoId: { type: String },
        thumbnailUrl: { type: String },
      },
    ],
    quiz: [
      {
        question: { type: String, required: true },
        options: { type: [String], required: true },
        correctAnswer: { type: Number, required: true },
      },
    ],
    dubs: {
      type: [
        new Schema<IDubTrack>(
          {
            lang: { type: String, required: true },
            label: { type: String, required: true },
            status: {
              type: String,
              enum: ['segmenting', 'awaiting_voices', 'translating', 'synthesizing', 'finalizing', 'ready', 'error'],
              default: 'segmenting',
            },
            progress: { type: Number, default: 0 },
            sourceDuration: { type: Number },
            segments: {
              type: [
                new Schema<IDubSegment>(
                  {
                    index: { type: Number, required: true },
                    start: { type: Number, required: true },
                    end: { type: Number, required: true },
                    speaker: { type: Number },
                    text: { type: String, required: true },
                    translatedText: { type: String },
                    status: {
                      type: String,
                      enum: ['pending', 'translated', 'synthesized', 'error'],
                      default: 'pending',
                    },
                    tempKey: { type: String },
                    durationSeconds: { type: Number },
                    actualStart: { type: Number },
                    actualEnd: { type: Number },
                    error: { type: String },
                  },
                  { _id: false }
                ),
              ],
              default: [],
            },
            voiceMap: { type: Schema.Types.Mixed, default: {} },
            speakerNames: { type: Schema.Types.Mixed, default: {} },
            maxDriftSeconds: { type: Number },
            url: { type: String },
            bucket: { type: String },
            key: { type: String },
            duration: { type: Number },
            error: { type: String },
          },
          // No schema-level timestamps here either — see the matching comment in the
          // panel's copy of this model for why (conflicts with saveTrack()'s update).
          { _id: false }
        ),
      ],
      default: [],
    },
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
