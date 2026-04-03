import mongoose from 'mongoose';

export interface IQuizResult extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  episodeSlug: string;
  score: number;
  totalQuestions: number;
  timeSpent: number; // In seconds
  createdAt: Date;
}

const QuizResultSchema = new mongoose.Schema<IQuizResult>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  episodeSlug: {
    type: String,
    required: true,
    index: true,
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  timeSpent: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Composite index to quickly find a user's best result for an episode
QuizResultSchema.index({ episodeSlug: 1, score: -1, timeSpent: 1 });

// Prevent model recompilation
if (mongoose.models.QuizResult) {
  delete mongoose.models.QuizResult;
}

const QuizResult = mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);
export default QuizResult;
