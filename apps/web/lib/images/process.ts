import sharp from "sharp";

// CLAUDE.md §11: reject anything not JPG/JPEG/PNG/WEBP, enforce a max size.
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;

/**
 * Blur/darkness are soft, advisory checks, not hard validation — unlike
 * type/size (objective, unambiguous), Laplacian-variance sharpness is a
 * coarse heuristic (see tests/image-processing.test.ts for the calibration
 * against synthetic test patterns: a smooth-but-in-focus photo of something
 * like calm water can score as low as a genuinely blurry one). Hard-blocking
 * on it risks rejecting legitimate reports. These thresholds are tunable
 * constants, same philosophy as CLAUDE.md §7's swappable risk-scoring
 * weights — expect to retune against real debris photos in production.
 */
export const BLUR_SHARPNESS_WARNING_THRESHOLD = 1.5;
export const DARKNESS_MEAN_WARNING_THRESHOLD = 30; // mean channel brightness, 0-255

export interface ImageProcessingResult {
  ok: boolean;
  /** Hard failures (type/size/corrupt file) — the upload must be rejected. */
  errors: string[];
  /** Soft heuristic flags (blur/darkness) — shown to the citizen, but they may proceed. */
  warnings: string[];
  /** Auto-oriented, sRGB, EXIF-orientation-stripped JPEG — only present when ok. */
  buffer?: Buffer;
  width?: number;
  height?: number;
}

export async function processComplaintImage(
  buffer: Buffer,
  declaredMimeType: string
): Promise<ImageProcessingResult> {
  const errors: string[] = [];

  if (!ALLOWED_MIME_TYPES.has(declaredMimeType)) {
    errors.push(`Unsupported file type: ${declaredMimeType}. Use JPG, PNG, or WEBP.`);
  }
  if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    errors.push(
      `File too large (${(buffer.byteLength / (1024 * 1024)).toFixed(1)}MB). Max size is ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`
    );
  }
  if (errors.length > 0) {
    return { ok: false, errors, warnings: [] };
  }

  let sourceFormat: string | undefined;
  try {
    sourceFormat = (await sharp(buffer, { failOn: "error" }).metadata()).format;
  } catch {
    return { ok: false, errors: ["File is not a valid JPEG/PNG/WEBP image."], warnings: [] };
  }
  if (!sourceFormat || !ALLOWED_FORMATS.has(sourceFormat)) {
    return { ok: false, errors: [`Unsupported or unrecognised image format: ${sourceFormat ?? "unknown"}.`], warnings: [] };
  }

  // .rotate() with no args reads the EXIF orientation tag, physically
  // rotates pixels to match, and strips the tag — downstream consumers never
  // need to re-interpret orientation. .toColorspace("srgb") is sharp's
  // default output anyway, but made explicit here since "never grayscale" is
  // a hard requirement, not an incidental default.
  const processedBuffer = await sharp(buffer, { failOn: "error" })
    .rotate()
    .toColorspace("srgb")
    .jpeg({ quality: 90 })
    .toBuffer();

  const [processedMeta, stats] = await Promise.all([
    sharp(processedBuffer).metadata(),
    sharp(processedBuffer).stats(),
  ]);

  const warnings: string[] = [];
  if (stats.sharpness < BLUR_SHARPNESS_WARNING_THRESHOLD) {
    warnings.push("This photo looks blurry. Consider retaking it for a clearer report.");
  }
  const rgbChannels = stats.channels.slice(0, 3);
  const meanBrightness = rgbChannels.reduce((sum, c) => sum + c.mean, 0) / rgbChannels.length;
  if (meanBrightness < DARKNESS_MEAN_WARNING_THRESHOLD) {
    warnings.push("This photo looks very dark. Consider retaking it in better light.");
  }

  return {
    ok: true,
    errors: [],
    warnings,
    buffer: processedBuffer,
    width: processedMeta.width,
    height: processedMeta.height,
  };
}
