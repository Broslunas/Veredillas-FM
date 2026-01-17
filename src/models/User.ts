import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  bio?: string;
  favorites: string[]; // Array de slugs de episodios favoritos
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
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
  lastLogin: {
    type: Date,
    default: Date.now
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
