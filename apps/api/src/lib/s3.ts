import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional: Your R2 custom domain or public URL

if (!R2_BUCKET) {
  throw new Error("R2_BUCKET is not set in the environment");
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error(
    "R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set in the environment"
  );
}

// Construct R2 endpoint URL
// Format: https://<account-id>.r2.cloudflarestorage.com
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// Create S3-compatible client configured for Cloudflare R2
const s3 = new S3Client({
  region: "auto", // R2 uses "auto" as the region
  endpoint: R2_ENDPOINT,
  forcePathStyle: true, // R2 requires path-style URLs, not virtual-hosted-style
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET as string,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getPresignedUrlForKey(
  key: string,
  ttlSec = 86400
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET as string, Key: key });
  return await getSignedUrl(s3, cmd, { expiresIn: ttlSec });
}

export async function getPresignedPutUrlForKey(
  key: string,
  contentType: string,
  ttlSec = 3600 // 1 hour default
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET as string,
    Key: key,
    ContentType: contentType,
  });
  return await getSignedUrl(s3, cmd, { expiresIn: ttlSec });
}

export async function downloadToBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: R2_BUCKET as string, Key: key })
  );
  if (!res.Body) throw new Error(`R2 object ${key} has empty body`);
  const stream = res.Body as any;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Check if a file exists in R2 without downloading it
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({ Bucket: R2_BUCKET as string, Key: key })
    );
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Delete a file from R2
 * Silently handles cases where the file doesn't exist
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET as string, Key: key })
    );
  } catch (error: any) {
    // If file doesn't exist, that's fine - we're deleting anyway
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return;
    }
    throw error;
  }
}

/**
 * Delete multiple files from R2
 * Continues even if some files don't exist
 */
export async function deleteObjects(keys: string[]): Promise<void> {
  // Delete files in parallel, but don't fail if some don't exist
  await Promise.allSettled(
    keys.map((key) => deleteObject(key).catch((err) => {
      // Log but don't throw - we want to continue deleting other files
      console.warn(`Failed to delete S3 object ${key}:`, err);
    }))
  );
}
