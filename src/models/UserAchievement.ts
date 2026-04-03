import mongoose from 'mongoose';

export interface IUserAchievement extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  achievementId: string;
  unlockedAt: Date;
}

const UserAchievementSchema = new mongoose.Schema<IUserAchievement>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  achievementId: {
    type: String,
    required: true,
  },
  unlockedAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique constraint: one user cannot unlock the same achievement twice
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

// Force model rebuild in dev
if (mongoose.models.UserAchievement) {
  delete mongoose.models.UserAchievement;
}

const UserAchievement = mongoose.model<IUserAchievement>('UserAchievement', UserAchievementSchema);
export default UserAchievement;
