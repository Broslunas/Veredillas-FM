import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  bio?: string;
  favorites: string[]; // Array de slugs de episodios favoritos
  playbackHistory: {
    episodeSlug: string;
    progress: number; // in seconds
    duration: number; // total duration in seconds
    listenedAt: Date;
    completed: boolean;
  }[];
  listeningTime: number; // Total seconds listened
  completedEpisodes: string[]; // Slugs of fully-listened episodes (persistent, never truncated)
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
  lastActiveAt: Date; // Last time the user interacted/loaded the app
  currentStreak: number; // Consecutive days of activity
  maxStreak: number; // Record streak
  role: 'user' | 'admin' | 'owner';
  newsletter: boolean;
  likedClips: string[];
  pushSubscriptions: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }[];
}

const userSchema = new mongoose.Schema<IUser>({
  googleId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  picture: {
    type: String
  },
  bio: {
    type: String,
    maxlength: 500
  },
  favorites: {
    type: [String],
    default: []
  },
  playbackHistory: [{
    episodeSlug: { type: String, required: true },
    progress: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    listenedAt: { type: Date, default: Date.now },
    completed: { type: Boolean, default: false }
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  maxStreak: {
    type: Number,
    default: 0
  },
  newsletter: {
    type: Boolean,
    default: true
  },
  listeningTime: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'owner'],
    default: 'user'
  },
  likedClips: {
    type: [String],
    default: []
  },
  completedEpisodes: {
    type: [String],
    default: []
  },
  pushSubscriptions: {
    type: [{
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String
      }
    }],
    default: []
  },
}, {
  timestamps: true,
  strict: true,
  strictQuery: false
});

// Prevent model recompilation in development
// Delete existing model if schema changed
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User = mongoose.model<IUser>('User', userSchema);

export default User;
