import mongoose from 'mongoose';

export interface IUnlockedCard extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  guestSlug: string; // Matches the content/guests/*.md filename
  episodeSlug: string; // The episode that triggered the unlock
  unlockedAt: Date;
}

const UnlockedCardSchema = new mongoose.Schema<IUnlockedCard>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  guestSlug: {
    type: String,
    required: true,
  },
  episodeSlug: {
    type: String,
    required: true,
  },
  unlockedAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique constraint: one user cannot unlock the same guest card twice
UnlockedCardSchema.index({ userId: 1, guestSlug: 1 }, { unique: true });

// Force model rebuild in dev
if (mongoose.models.UnlockedCard) {
  delete mongoose.models.UnlockedCard;
}

const UnlockedCard = mongoose.model<IUnlockedCard>('UnlockedCard', UnlockedCardSchema);
export default UnlockedCard;
