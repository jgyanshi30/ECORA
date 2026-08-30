import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage (CLAUDE.md §1) — MinIO in local dev,
 * Cloudflare R2 in the CLAUDE.md §13 hackathon deployment (see DEPLOY.md).
 * `forcePathStyle` is required for MinIO (and most self-hosted S3-compatible
 * stores) since they don't support the virtual-hosted-style
 * `bucket.endpoint` addressing AWS itself defaults to; R2 explicitly
 * documents supporting path-style addressing too, so this stays on whenever
 * a custom STORAGE_ENDPOINT is configured (MinIO, R2, or otherwise).
 *
 * `requestChecksumCalculation: "WHEN_REQUIRED"` — as of aws-sdk v3's
 * "flexible checksums" change, the client default (`WHEN_SUPPORTED`)
 * attaches a trailing CRC32 checksum to every PutObject request whenever the
 * operation supports one, which is effectively always. MinIO accepts this
 * fine (confirmed: every automated test and local upload in this project
 * exercises it), but it's a documented source of upload failures against
 * Cloudflare R2 specifically, which doesn't reliably support the checksum
 * trailer on every account/region. `WHEN_REQUIRED` reverts to only sending a
 * checksum when the S3 API operation strictly mandates one (plain
 * PutObject/GetObject don't) — a strict subset of the default behavior, so
 * it cannot regress anything that already works, and it's the fix R2's own
 * ecosystem documents for aws-sdk v3 client-s3 users.
 */
const s3 = new S3Client({
  region: process.env.STORAGE_REGION || "us-east-1", // R2 requires the literal value "auto" — see DEPLOY.md
  endpoint: process.env.STORAGE_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.STORAGE_ENDPOINT),
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials:
    process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_SECRET_KEY
      ? { accessKeyId: process.env.STORAGE_ACCESS_KEY, secretAccessKey: process.env.STORAGE_SECRET_KEY }
      : undefined,
});

function bucket(): string {
  const name = process.env.STORAGE_BUCKET;
  if (!name) throw new Error("STORAGE_BUCKET is not configured.");
  return name;
}

/** Uploads a complaint image (or any object) by key. Never a public bucket path (CLAUDE.md §0) — read access only via getSignedGetUrl. */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));
}

/** Signed, time-limited read URL (CLAUDE.md §11) — the only way stored images are ever served. */
export async function getSignedGetUrl(key: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/** Existence/metadata check without downloading the object — used by verification tooling, not app request paths. */
export async function headObject(key: string): Promise<{ contentType?: string; contentLength?: number }> {
  const result = await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
  return { contentType: result.ContentType, contentLength: result.ContentLength };
}

/** Downloads an object's full bytes — used by the inference pipeline (lib/inference/process-job.ts) to fetch a complaint's stored original image before sending it to the FastAPI service. */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const result = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const body = result.Body;
  if (!body) throw new Error(`Object has no body: ${key}`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
