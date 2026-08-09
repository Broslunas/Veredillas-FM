import mongoose from 'mongoose';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

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
  console.log("Connected to Mongo");

  const r2Res = await r2.send(new ListObjectsV2Command({ Bucket: "vfm-bucket-01" }));
  const r2Files = r2Res.Contents || [];

  const dbEpisodes = await EpisodeContent.find({}).sort({ season: 1, episode: 1 });

  console.log("\n--- DB EPISODES ---");
  for (const ep of dbEpisodes) {
    console.log(`S${ep.season} E${ep.episode} | Slug: ${ep.slug} | Title: "${ep.title}" | videoUrl: ${ep.videoUrl || 'NONE'}`);
  }

  console.log("\n--- R2 FILES ---");
  for (const f of r2Files) {
    console.log(`Key: ${f.Key}`);
  }

  // Matching logic:
  console.log("\n--- MAPPING MATCHES ---");
  const updates = [];

  for (const ep of dbEpisodes) {
    // Look for R2 file matching S{season}-E{episode}
    const targetPrefix = `videos/S${ep.season}-E${ep.episode}-`;
    const matchedR2 = r2Files.find(f => f.Key.startsWith(targetPrefix));
    if (matchedR2) {
      console.log(`MATCH! DB (S${ep.season}E${ep.episode} - ${ep.slug}) => R2 key: "${matchedR2.Key}"`);
      updates.push({ slug: ep.slug, r2Key: matchedR2.Key });
    } else {
      console.log(`NO MATCH FOR: DB (S${ep.season}E${ep.episode} - ${ep.slug})`);
    }
  }

  console.log(`Total matched: ${updates.length} / ${dbEpisodes.length}`);

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
