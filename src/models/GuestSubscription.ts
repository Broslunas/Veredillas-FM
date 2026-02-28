import mongoose from 'mongoose';

export interface IGuestSubscription extends mongoose.Document {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}

const guestSubscriptionSchema = new mongoose.Schema<IGuestSubscription>({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  }
}, { timestamps: true });

if (mongoose.models.GuestSubscription) {
  delete mongoose.models.GuestSubscription;
}

const GuestSubscription = mongoose.model<IGuestSubscription>('GuestSubscription', guestSubscriptionSchema);

export default GuestSubscription;
