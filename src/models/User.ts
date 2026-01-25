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
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
  role: 'user' | 'admin' | 'owner';
  newsletter: boolean;
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
  }
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
