import mongoose from 'mongoose';

const DeletedMessageLogSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  room: { type: String, required: true, index: true },
  deletedAt: { type: Date, default: Date.now, expires: 60 } // Keep for 60 seconds, enough for clients to sync
});

export default mongoose.models.DeletedMessageLog || mongoose.model('DeletedMessageLog', DeletedMessageLogSchema);
