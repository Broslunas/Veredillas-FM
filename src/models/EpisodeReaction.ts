import mongoose from 'mongoose';

export interface IEpisodeReaction extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  episodeSlug: string;
  type: 'like' | 'dislike';
  createdAt: Date;
  updatedAt: Date;
}

const episodeReactionSchema = new mongoose.Schema<IEpisodeReaction>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  episodeSlug: { type: String, required: true, index: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
}, {
  timestamps: true
});

// Create a compound index to ensure one reaction per user per episode
episodeReactionSchema.index({ userId: 1, episodeSlug: 1 }, { unique: true });

if (mongoose.models.EpisodeReaction) {
  delete mongoose.models.EpisodeReaction;
}

const EpisodeReaction = mongoose.model<IEpisodeReaction>('EpisodeReaction', episodeReactionSchema);

export default EpisodeReaction;
