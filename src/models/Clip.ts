import mongoose from 'mongoose';

const ClipSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  likes: {
    type: Number,
    default: 0,
    index: true, // For sorting by likes
  },
  lastLikedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Clip || mongoose.model('Clip', ClipSchema);
