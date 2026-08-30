"use server";

import { auth } from "@/auth";
import { processComplaintImage } from "@/lib/images/process";

export interface ImageValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Data URL of the corrected (auto-oriented, RGB) preview — interactive feedback only. */
  previewDataUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Interactive, per-file feedback during the wizard only — not the
 * authoritative processing step. The final submission action (step 5c)
 * re-receives the original File objects and re-runs processComplaintImage
 * itself before persisting anything; this action never stores or forwards
 * its result anywhere.
 */
export async function validateComplaintImageAction(formData: FormData): Promise<ImageValidationResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, errors: ["You must be signed in."], warnings: [] };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, errors: ["No file provided."], warnings: [] };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processComplaintImage(buffer, file.type);

  if (!result.ok) {
    return { ok: false, errors: result.errors, warnings: [] };
  }

  return {
    ok: true,
    errors: [],
    warnings: result.warnings,
    previewDataUrl: `data:image/jpeg;base64,${result.buffer!.toString("base64")}`,
    width: result.width,
    height: result.height,
  };
}
