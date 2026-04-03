import mongoose from 'mongoose';

const ChatBanSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true }, // The episode slug
  value: { type: String, required: true }, // userId or guestName
  type: { type: String, enum: ['userId', 'name', 'ip', 'sessionId'], required: true },
  bannedAt: { type: Date, default: Date.now }
});

// Compound index to quickly check if a specific user is banned in a room
ChatBanSchema.index({ room: 1, value: 1 }, { unique: true });

// Prevent HMR issues with cached models
if (process.env.NODE_ENV === 'development' && mongoose.models.ChatBan) {
  delete mongoose.models.ChatBan;
}

export default mongoose.models.ChatBan || mongoose.model('ChatBan', ChatBanSchema);
