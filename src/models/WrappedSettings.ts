import mongoose from 'mongoose';

export interface IWrappedSettings extends mongoose.Document {
  isActive: boolean;
  year: number;
}

const wrappedSettingsSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  year: { type: Number, required: true, default: () => new Date().getFullYear() },
}, { timestamps: true });

export default mongoose.models.WrappedSettings || mongoose.model<IWrappedSettings>('WrappedSettings', wrappedSettingsSchema);
