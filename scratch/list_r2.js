import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

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
  let isTruncated = true;
  let continuationToken = undefined;
  let allObjects = [];

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: "vfm-bucket-01",
      ContinuationToken: continuationToken
    });

    try {
      const res = await r2.send(command);
      if (res.Contents) {
        allObjects.push(...res.Contents);
      }
      isTruncated = res.IsTruncated || false;
      continuationToken = res.NextContinuationToken;
    } catch (err) {
      console.error("Error listing R2 bucket:", err);
      break;
    }
  }

  console.log("Total objects in R2:", allObjects.length);
  allObjects.forEach(item => {
    console.log(`Key: "${item.Key}" | Size: ${(item.Size / 1024 / 1024).toFixed(2)} MB`);
  });
}

main();
