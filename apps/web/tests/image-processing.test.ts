import { describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  BLUR_SHARPNESS_WARNING_THRESHOLD,
  DARKNESS_MEAN_WARNING_THRESHOLD,
  MAX_IMAGE_SIZE_BYTES,
  processComplaintImage,
} from "@/lib/images/process";

// Sharp reference image: a fine checkerboard has strong edges everywhere,
// giving a high Laplacian-variance sharpness score (see the module's
// calibration notes) — a reasonable stand-in for an in-focus photo.
async function makeCheckerboardJpeg(opts: { width?: number; height?: number; orientation?: number } = {}) {
  const width = opts.width ?? 200;
  const height = opts.height ?? 200;
  const buf = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isWhite = (Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0;
      const v = isWhite ? 255 : 0;
      const idx = (y * width + x) * 3;
      buf[idx] = v;
      buf[idx + 1] = v;
      buf[idx + 2] = v;
    }
  }
  let pipeline = sharp(buf, { raw: { width, height, channels: 3 } }).jpeg();
  if (opts.orientation) {
    pipeline = pipeline.withMetadata({ orientation: opts.orientation });
  }
  return pipeline.toBuffer();
}

async function makeFlatJpeg(rgb: { r: number; g: number; b: number }, size = 200) {
  return sharp({ create: { width: size, height: size, channels: 3, background: rgb } }).jpeg().toBuffer();
}

describe("processComplaintImage", () => {
  it("accepts a valid, sharp, well-lit JPEG with no warnings", async () => {
    const buf = await makeCheckerboardJpeg();
    const result = await processComplaintImage(buf, "image/jpeg");
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it("rejects a disallowed mime type", async () => {
    const buf = await makeCheckerboardJpeg();
    const result = await processComplaintImage(buf, "image/gif");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/unsupported file type/i);
  });

  it("rejects a file over the size limit", async () => {
    const oversized = Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1);
    const result = await processComplaintImage(oversized, "image/jpeg");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/too large/i);
  });

  it("rejects a file that isn't actually a decodable image", async () => {
    const result = await processComplaintImage(Buffer.from("not an image"), "image/jpeg");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/not a valid/i);
  });

  it("corrects EXIF orientation and strips the tag", async () => {
    // Stored as 100x50 with orientation=6 (rotate 90deg CW to display correctly)
    // -> corrected output should be 50x100, with no orientation tag left over.
    const buf = await makeCheckerboardJpeg({ width: 100, height: 50, orientation: 6 });
    const rawMeta = await sharp(buf).metadata();
    expect(rawMeta.width).toBe(100);
    expect(rawMeta.height).toBe(50);
    expect(rawMeta.orientation).toBe(6);

    const result = await processComplaintImage(buf, "image/jpeg");
    expect(result.ok).toBe(true);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);

    const outputMeta = await sharp(result.buffer!).metadata();
    expect(outputMeta.orientation).toBeUndefined();
  });

  it("always outputs RGB (3 channels), even from a greyscale-mode source", async () => {
    const grey = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 90, g: 90, b: 90 } } })
      .toColourspace("b-w")
      .jpeg()
      .toBuffer();
    const greyMeta = await sharp(grey).metadata();
    expect(greyMeta.channels).toBe(1);

    const result = await processComplaintImage(grey, "image/jpeg");
    expect(result.ok).toBe(true);
    const outputMeta = await sharp(result.buffer!).metadata();
    expect(outputMeta.space).toBe("srgb");
    expect(outputMeta.channels).toBe(3);
  });

  it("flags a heavily blurred image with a warning, but still accepts it", async () => {
    const sharpBuf = await makeCheckerboardJpeg();
    const blurryBuf = await sharp(sharpBuf).blur(15).jpeg().toBuffer();

    const sharpStats = await sharp(sharpBuf).stats();
    const blurryStats = await sharp(blurryBuf).stats();
    expect(blurryStats.sharpness).toBeLessThan(sharpStats.sharpness);
    expect(blurryStats.sharpness).toBeLessThan(BLUR_SHARPNESS_WARNING_THRESHOLD);

    const result = await processComplaintImage(blurryBuf, "image/jpeg");
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => /blurry/i.test(w))).toBe(true);
  });

  it("flags a very dark image with a warning, but still accepts it", async () => {
    const darkBuf = await makeFlatJpeg({ r: 8, g: 8, b: 8 });
    const stats = await sharp(darkBuf).stats();
    expect(stats.channels[0]!.mean).toBeLessThan(DARKNESS_MEAN_WARNING_THRESHOLD);

    const result = await processComplaintImage(darkBuf, "image/jpeg");
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => /dark/i.test(w))).toBe(true);
  });

  it("does not warn about brightness for a normally-lit image", async () => {
    const normalBuf = await makeFlatJpeg({ r: 140, g: 150, b: 130 });
    const result = await processComplaintImage(normalBuf, "image/jpeg");
    expect(result.warnings.some((w) => /dark/i.test(w))).toBe(false);
  });
});
