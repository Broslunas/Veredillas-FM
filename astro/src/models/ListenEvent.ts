import mongoose from 'mongoose';

const ListenEventSchema = new mongoose.Schema({
  episodeSlug: { 
    type: String, 
    required: true,
    index: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  userId: { 
    type: String, 
    required: false 
  },
  // Optional: extended metadata for analytics
  userAgent: String,
  ip: String, // Be careful with privacy
  duration: Number // How long they listened if we want to track that here
});

// Compound index for efficient querying of "top episodes in time range"
ListenEventSchema.index({ timestamp: -1, episodeSlug: 1 });

export default mongoose.models.ListenEvent || mongoose.model('ListenEvent', ListenEventSchema);
