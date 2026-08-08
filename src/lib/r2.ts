import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "Not Found";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "Not Found";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "Not Found";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "Not Found";
const R2_ENDPOINT = process.env.R2_ENDPOINT || "Not Found";

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export const BUCKET_NAME = R2_BUCKET_NAME;

/**
 * Generates a direct presigned URL from Cloudflare R2 for zero-Vercel-traffic client streaming.
 */
export async function getDirectR2StreamUrl(key: string, expiresInSeconds: number = 86400 * 7): Promise<string> {
  // If key already starts with http, return as is
  if (key.startsWith('http')) return key;

  // Clean key if prefixed with /api/stream/
  const cleanKey = key.replace(/^\/api\/stream\//, '');

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cleanKey,
  });

  return await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

export async function getR2Object(key: string, range?: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ...(range ? { Range: range } : {}),
  });

  return await r2Client.send(command);
}

export async function getR2ObjectHead(key: string) {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await r2Client.send(command);
}
