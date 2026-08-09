import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function main() {
  const key = "videos/S1-E2-el-bi-logo-que-nos-gu-a-en-la-inform-tica-ft-alejandro-8aa812db.mp4";
  const command = new GetObjectCommand({
    Bucket: "vfm-bucket-01",
    Key: key
  });

  // Generate 7-day presigned URL (or 24h)
  const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 * 24 * 7 });
  console.log("\nGenerated Presigned URL (Direct R2 stream):");
  console.log(presignedUrl);

  // Test range fetch on presigned URL
  const res = await fetch(presignedUrl, {
    headers: { Range: "bytes=0-1024" }
  });

  console.log("\nResponse Status:", res.status);
  console.log("Content-Range:", res.headers.get("content-range"));
  console.log("Content-Length:", res.headers.get("content-length"));
  console.log("Content-Type:", res.headers.get("content-type"));
}

main().catch(err => console.error(err));
