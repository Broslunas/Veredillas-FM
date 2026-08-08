import mongoose from 'mongoose';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://1bdeaebce2649429d4562a6272fd127c.eu.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "33479da4b52490f9a9bbff3e4a2c92cb",
    secretAccessKey: "3b7b01723ef853c1b31b4324021144846a29d8b4b71246eac96dda446877a860"
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
  console.log("Connected to MongoDB");

  const r2Res = await r2.send(new ListObjectsV2Command({ Bucket: "vfm-bucket-01" }));
  const r2Files = r2Res.Contents || [];

  const dbEpisodes = await EpisodeContent.find({}).sort({ season: 1, episode: 1 });

  let updatedCount = 0;

  for (const ep of dbEpisodes) {
    const targetPrefix = `videos/S${ep.season}-E${ep.episode}-`;
    const matchedR2 = r2Files.find(f => f.Key.startsWith(targetPrefix));

    if (matchedR2) {
      const streamUrl = `/api/stream/${matchedR2.Key}`;
      console.log(`[UPDATED] S${ep.season}E${ep.episode} (${ep.slug}) -> videoUrl: "${streamUrl}"`);

      // Update Mongo DB
      await EpisodeContent.updateOne({ slug: ep.slug }, { $set: { videoUrl: streamUrl } });

      // Update Markdown frontmatter if file exists
      const mdPath = path.join(process.cwd(), 'src', 'content', 'episodios', `${ep.slug}.md`);
      if (fs.existsSync(mdPath)) {
        let content = fs.readFileSync(mdPath, 'utf-8');
        if (content.includes('videoUrl:')) {
          content = content.replace(/videoUrl:\s*["']?.*["']?/, `videoUrl: "${streamUrl}"`);
        } else {
          // Insert videoUrl into frontmatter right before the second ---
          content = content.replace(/^(---\s*[\s\S]*?)(---)/m, `$1videoUrl: "${streamUrl}"\n$2`);
        }
        fs.writeFileSync(mdPath, content, 'utf-8');
      }

      updatedCount++;
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} episodes with Cloudflare R2 video URLs!`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Error syncing R2 episodes:", err);
  process.exit(1);
});
