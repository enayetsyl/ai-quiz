import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET_UPLOADS;

if (!BUCKET) {
  throw new Error("S3_BUCKET_UPLOADS is not set in the environment");
}

const s3 = new S3Client({ region: REGION });

export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET as string,
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
  const cmd = new GetObjectCommand({ Bucket: BUCKET as string, Key: key });
  return await getSignedUrl(s3, cmd, { expiresIn: ttlSec });
}

export async function downloadToBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET as string, Key: key })
  );
  if (!res.Body) throw new Error(`S3 object ${key} has empty body`);
  const stream = res.Body as any;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
