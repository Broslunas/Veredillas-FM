import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://1bdeaebce2649429d4562a6272fd127c.eu.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "33479da4b52490f9a9bbff3e4a2c92cb",
    secretAccessKey: "3b7b01723ef853c1b31b4324021144846a29d8b4b71246eac96dda446877a860"
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
