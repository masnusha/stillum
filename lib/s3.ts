import { S3Client } from "@aws-sdk/client-s3";

// S3-compatible client — works with AWS S3, Cloudflare R2, MinIO.
// Set S3_ENDPOINT for non-AWS providers (e.g. R2: https://<account>.r2.cloudflarestorage.com).
export const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  // Required for Cloudflare R2 and path-style S3-compatible providers.
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

export const S3_BUCKET = process.env.S3_BUCKET_NAME!;

// Public base URL for constructing audioUrl after upload.
// Example: https://pub-<hash>.r2.dev  or  https://s3.region.amazonaws.com/bucket
export const S3_PUBLIC_BASE = process.env.S3_PUBLIC_URL!.replace(/\/$/, "");
