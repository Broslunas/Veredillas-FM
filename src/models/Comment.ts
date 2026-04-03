
import mongoose from 'mongoose';

export interface IComment extends mongoose.Document {
  slug: string;
  name: string;
  email: string;
  text: string;
  createdAt: Date;
  likes: string[];
}

const CommentSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this comment.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide an email for this comment.'],
    trim: true,
    lowercase: true,
  },
  text: {
    type: String,
    required: [true, 'Please provide the comment text.'],
    maxlength: [1000, 'Comment cannot be more than 1000 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  likes: {
    type: [String],
    default: []
  },
  verificationToken: {
    type: String,
    select: false, 
  },
  deletionToken: {
    type: String,
    select: false,
  }
});

// Force model rebuild in development to ensure schema changes apply
if (process.env.NODE_ENV === 'development' && mongoose.models.Comment) {
  delete mongoose.models.Comment;
}

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
