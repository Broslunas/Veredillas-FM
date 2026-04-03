import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    index: true, 
  },
  user: {
    name: { type: String, required: true },
    avatar: { type: String, default: '' },
    userId: { type: String }, // Optional, if linked to a registered user
    sessionId: { type: String }, // For guest bans
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
  },
  content: {
    type: String,
    required: true,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
});

// Prevent HMR issues with cached models
if (process.env.NODE_ENV === 'development' && mongoose.models.ChatMessage) {
  delete mongoose.models.ChatMessage;
}

export default mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
