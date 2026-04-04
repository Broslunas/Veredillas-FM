import mongoose from 'mongoose';

/**
 * Short-lived record created by the Apps Script bridge (server-to-server).
 * The main tab polls for it and "claims" it to set session cookies.
 * MongoDB TTL index auto-deletes it after 5 minutes.
 */
const schema = new mongoose.Schema({
  authId: { type: String, required: true, unique: true },
  email:  { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // 5 min TTL
});

if (mongoose.models.PendingCanariasAuth) delete mongoose.models.PendingCanariasAuth;
export const PendingCanariasAuth = mongoose.model('PendingCanariasAuth', schema);
