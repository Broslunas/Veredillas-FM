import mongoose from 'mongoose';

// Schema to track active users/listeners for social proof
// We expire documents automatically after 5 minutes (300 seconds) of inactivity
const ActiveListenerSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  lastSeen: { 
    type: Date, 
    default: Date.now,
    expires: 300 // MongoDB TTL index: auto-delete after 5 mins
  },
  path: {
    type: String, // Optional: track which page they are on
    default: '/'
  },
  userAgent: String, // Optional: for debugging or filtering bots
  userId: { type: String, required: false },
  name: { type: String, required: false },
  picture: { type: String, required: false }
});

// Prevent overwrite on hot reload
export default mongoose.models.ActiveListener || mongoose.model('ActiveListener', ActiveListenerSchema);
