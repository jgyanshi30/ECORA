import { describe, expect, it } from "vitest";

import { getSignedGetUrl, headObject, putObject } from "@/lib/storage/s3";

/**
 * Hits the real local-dev MinIO container (infra/db/docker-compose.yml),
 * the same "real service in dev, not mocks" convention this repo already
 * uses for Postgres-backed tests (see tests/citizen-dashboard.test.ts etc.)
 * — MinIO is S3-compatible, so this exercises the exact code path
 * production S3/GCS would run.
 */
describe("object storage (MinIO)", () => {
  it("round-trips an uploaded object and can fetch it back via a signed URL", async () => {
    const key = `tests/storage-${Date.now()}.txt`;
    const body = Buffer.from(`hello from storage.test.ts at ${new Date().toISOString()}`);

    await putObject(key, body, "text/plain");

    const meta = await headObject(key);
    expect(meta.contentType).toBe("text/plain");
    expect(meta.contentLength).toBe(body.byteLength);

    const signedUrl = await getSignedGetUrl(key, 60);
    expect(signedUrl).toMatch(/^http/);
    expect(signedUrl).toContain("X-Amz-Signature");

    const response = await fetch(signedUrl);
    expect(response.status).toBe(200);
    const fetched = Buffer.from(await response.arrayBuffer());
    expect(fetched.equals(body)).toBe(true);
  });

  it("produces a signed URL that stops working once expired", async () => {
    const key = `tests/storage-expiring-${Date.now()}.txt`;
    await putObject(key, Buffer.from("expires soon"), "text/plain");

    // expiresIn accepts whole seconds only; 1s is the smallest realistic window.
    const signedUrl = await getSignedGetUrl(key, 1);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const response = await fetch(signedUrl);
    expect(response.status).toBe(403);
  });
});
