import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: "https://1bdeaebce2649429d4562a6272fd127c.eu.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "33479da4b52490f9a9bbff3e4a2c92cb",
    secretAccessKey: "3b7b01723ef853c1b31b4324021144846a29d8b4b71246eac96dda446877a860"
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
