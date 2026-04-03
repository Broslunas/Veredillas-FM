import mongoose from 'mongoose';

const ChatReactionSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    index: true, 
  },
  type: {
    type: String,
    required: true, // e.g. 'heart', 'fire', 'clap'
    enum: ['heart', 'fire', 'clap', '100']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 // Auto-delete documents after 30 seconds (TTL index)
  },
});

export default mongoose.models.ChatReaction || mongoose.model('ChatReaction', ChatReactionSchema);
