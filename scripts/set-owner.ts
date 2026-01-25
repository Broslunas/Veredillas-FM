
import mongoose from 'mongoose';
import User from '../src/models/User';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables manually since we are in a standalone script context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

const targetEmail = 'pablo.luna.perez.008@gmail.com';

async function setOwner() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email: targetEmail });

    if (!user) {
      console.error(`❌ User with email ${targetEmail} not found.`);
      process.exit(1);
    }

    user.role = 'owner';
    await user.save();
    console.log(`✅ Successfully updated ${targetEmail} to role 'owner'.`);

  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

setOwner();
