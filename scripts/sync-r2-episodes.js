import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-1bdeaebce2649429d4562a6272fd127c.r2.dev';

const EpisodeContentSchema = new mongoose.Schema({
  slug: String,
  title: String,
  season: Number,
  episode: Number,
  audioUrl: String,
  videoUrl: String,
});

const EpisodeContent = mongoose.models.EpisodeContent || mongoose.model('EpisodeContent', EpisodeContentSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const legacyEpisodes = await EpisodeContent.find({ videoUrl: /^\/api\/stream\// }).sort({ season: 1, episode: 1 });

  let updatedCount = 0;

  for (const ep of legacyEpisodes) {
    const key = ep.videoUrl.replace(/^\/api\/stream\//, '');
    const directUrl = `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`;

    console.log(`[UPDATED] S${ep.season}E${ep.episode} (${ep.slug}) -> videoUrl: "${ep.videoUrl}" => "${directUrl}"`);

    await EpisodeContent.updateOne({ _id: ep._id }, { $set: { videoUrl: directUrl } });
    updatedCount++;
  }

  console.log(`\nSuccessfully migrated ${updatedCount} episodes from /api/stream/ URLs to direct R2 public URLs!`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error migrating episode video URLs:", err);
  process.exit(1);
});
