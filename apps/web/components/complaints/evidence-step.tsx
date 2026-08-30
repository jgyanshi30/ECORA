"use client";

import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useRef } from "react";

import { Label } from "@/components/ui/label";
import { MAX_PHOTOS } from "@/lib/complaints/constants";
import { validateComplaintImageAction } from "@/lib/complaints/actions/validate-image";

export { MAX_PHOTOS };

export interface EvidencePhoto {
  id: string;
  file: File;
  status: "validating" | "ok" | "error";
  errors: string[];
  warnings: string[];
  previewUrl?: string;
}

export interface EvidenceStepProps {
  photos: EvidencePhoto[];
  /**
   * A real useState setter (Dispatch<SetStateAction<...>>), not a plain
   * (photos) => void — this component fires several async validations
   * concurrently (one per selected file) and each resolution needs to update
   * based on the LATEST state, not whatever `photos` this closure captured
   * when the file was first selected. A plain setter taking only the new
   * array would go stale exactly like step 3's useActionState bug (two
   * updates racing, one clobbering the other); React's functional-updater
   * form is what actually guarantees correctness here.
   */
  onPhotosChange: Dispatch<SetStateAction<EvidencePhoto[]>>;
  description: string;
  onDescriptionChange: (value: string) => void;
}

/**
 * A single <input accept="image/*" capture="environment" multiple"> serves
 * both "photo capture (rear camera)" and "multi-file upload" — on mobile
 * browsers that support it, the `capture` attribute launches the camera
 * directly (defaulting to the rear/environment-facing one); desktop browsers
 * ignore it and show a normal multi-file picker. No separate code paths
 * needed. "Replace" is handled as remove-then-reselect rather than a
 * distinct mechanism — same end result, less UI surface.
 */
export function EvidenceStep({ photos, onPhotosChange, description, onDescriptionChange }: EvidenceStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    const files = Array.from(fileList).slice(0, Math.max(remainingSlots, 0));

    const pending: EvidencePhoto[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "validating",
      errors: [],
      warnings: [],
      previewUrl: URL.createObjectURL(file),
    }));

    onPhotosChange((current) => [...current, ...pending]);

    for (const photo of pending) {
      const formData = new FormData();
      formData.set("file", photo.file);

      // A file large enough to trip Next's own transport-level Server Action
      // body-size limit (rather than lib/images/process.ts's own graceful
      // MAX_IMAGE_SIZE_BYTES check) throws instead of resolving — confirmed
      // by reproducing it directly. Without this catch, that surfaces as an
      // unhandled rejection with no UI feedback at all, rather than the
      // "too large" message a citizen actually needs to see.
      let result: Awaited<ReturnType<typeof validateComplaintImageAction>>;
      try {
        result = await validateComplaintImageAction(formData);
      } catch {
        result = { ok: false, errors: ["This file couldn't be uploaded — it may be too large."], warnings: [] };
      }

      onPhotosChange((current) =>
        current.map((p) =>
          p.id === photo.id
            ? {
                ...p,
                status: result.ok ? "ok" : "error",
                errors: result.errors,
                warnings: result.warnings,
                previewUrl: result.previewDataUrl ?? p.previewUrl,
              }
            : p
        )
      );
    }
  }

  function removePhoto(id: string) {
    onPhotosChange((current) => {
      const target = current.find((p) => p.id === id);
      if (target?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(target.previewUrl);
      return current.filter((p) => p.id !== id);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Evidence</h2>
        <p className="text-sm text-muted-foreground">
          Add up to {MAX_PHOTOS} photos of the debris. JPG, PNG, or WEBP, max 15MB each.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative h-32 w-32 overflow-hidden rounded-lg border border-border">
            {photo.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- transient client-side preview (blob:/data: URL), not an optimizable static asset
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => removePhoto(photo.id)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
            {photo.status === "validating" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            {photo.status === "error" && (
              <div className="absolute inset-x-0 bottom-0 bg-destructive/90 p-1 text-[10px] leading-tight text-destructive-foreground">
                {photo.errors.join(" ")}
              </div>
            )}
            {photo.status === "ok" && photo.warnings.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 flex items-start gap-1 bg-amber-500/90 p-1 text-[10px] leading-tight text-white">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                {/* Every warning, not just the first — a photo can be both
                    blurry and dark at once (e.g. a flat, dim scene), and an
                    earlier version silently dropped whichever warning wasn't
                    first in the array. */}
                <span>{photo.warnings.join(" ")}</span>
              </div>
            )}
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          maxLength={2000}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none"
          placeholder="Anything else that would help — how much debris, what it looks like, etc."
        />
      </div>
    </div>
  );
}
