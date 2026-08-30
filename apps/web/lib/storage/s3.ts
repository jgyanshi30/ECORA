import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible object storage (CLAUDE.md §1) — MinIO in local dev,
 * Backblaze B2 in the CLAUDE.md §13 hackathon deployment (see DEPLOY.md).
 * Cloudflare R2 was the original target but turned out to require a card
 * on file even for its free tier; the config below still supports R2 (it's
 * a config difference, not a code difference) in case that changes.
 *
 * Researched each provider's actual S3-compatible docs rather than assuming
 * "S3-compatible" is drop-in identical across providers — that exact
 * assumption already cost a real bug once (see the checksum note below).
 *
 * `forcePathStyle` is required for MinIO (and most self-hosted S3-compatible
 * stores) since they don't support the virtual-hosted-style
 * `bucket.endpoint` addressing AWS itself defaults to. Both R2 and B2
 * explicitly document supporting path-style addressing as well (B2's own
 * S3-compatible API docs: bucket name may go in the hostname *or* the path),
 * so this stays on whenever a custom STORAGE_ENDPOINT is configured, for any
 * of the three providers.
 *
 * `requestChecksumCalculation: "WHEN_REQUIRED"` — as of aws-sdk v3's
 * "flexible checksums" change, the client default (`WHEN_SUPPORTED`)
 * attaches a trailing CRC32 checksum to every PutObject request whenever the
 * operation supports one, which is effectively always. MinIO accepts this
 * fine (confirmed: every automated test and local upload in this project
 * exercises it), but it was a documented source of upload failures against
 * both Cloudflare R2 and Backblaze B2 — confirmed via research, not assumed
 * to generalize from the R2 case: B2 had the identical `x-amz-checksum-crc32`
 * rejection bug (issues filed against B2 Jan-Mar 2025), which Backblaze
 * fixed server-side in July 2025. Left set to `WHEN_REQUIRED` regardless of
 * B2's fix — it's a strict subset of the SDK default (only sends a checksum
 * when an operation strictly mandates one; plain PutObject/GetObject don't),
 * so it cannot regress anything that already works on any of the three
 * providers, whether or not each still needs it.
 *
 * Signed URLs (`getSignedGetUrl`, below) use standard SigV4 presigning —
 * both R2 and B2 document supporting presigned URLs (B2: v4 signatures
 * only, matching what `@aws-sdk/s3-request-presigner` generates), so no
 * provider-specific handling is needed there either.
 */
const s3 = new S3Client({
  // B2's region is embedded in its endpoint hostname (e.g. STORAGE_ENDPOINT=
  // https://s3.us-west-004.backblazeb2.com -> STORAGE_REGION=us-west-004) —
  // set STORAGE_REGION to that literal code, not a placeholder. R2 instead
  // requires the literal value "auto" (no real regions). See DEPLOY.md §2.
  region: process.env.STORAGE_REGION || "us-east-1",
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
