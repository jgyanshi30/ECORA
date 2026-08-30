"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/domain/form-message";
import type { EvidencePhoto } from "@/components/complaints/evidence-step";
import type { LocationData } from "@/components/complaints/location-step";
import { submitComplaintAction } from "@/lib/complaints/actions/submit";

const LocationMap = dynamic(() => import("./location-map").then((mod) => mod.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] w-full items-center justify-center rounded-lg border border-border bg-muted">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export interface ReviewStepProps {
  photos: EvidencePhoto[];
  description: string;
  location: LocationData;
  onSubmitted: (complaintNumber: string) => void;
}

/**
 * A genuine summary of what's about to be submitted, not a re-render of the
 * whole form — read-only photo thumbnails, a locked map, and the address
 * fields as plain text. Submitting re-sends the real File objects (not just
 * their earlier "ok" status) so the server can independently re-validate
 * everything, per submitComplaintAction's own docstring.
 */
export function ReviewStep({ photos, description, location, onSubmitted }: ReviewStepProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const addressLine = [location.locality, location.city, location.district, location.state, location.pinCode]
    .filter(Boolean)
    .join(", ");

  async function handleSubmit() {
    setStatus("uploading");
    setError(null);

    const formData = new FormData();
    for (const photo of photos) {
      if (photo.status === "ok") formData.append("photos", photo.file);
    }
    formData.set("description", description);
    formData.set(
      "location",
      JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        accuracyMeters: location.accuracyMeters,
        altitudeMeters: location.altitudeMeters,
        capturedAt: location.capturedAt,
        exifLat: location.exifLat,
        exifLng: location.exifLng,
        locality: location.locality,
        city: location.city,
        district: location.district,
        state: location.state,
        pinCode: location.pinCode,
        landmark: location.landmark,
        consentGiven: location.consentGiven,
      })
    );

    // The upload phase (a few compressed JPEGs) is fast; the request as a
    // whole now also waits through synchronous AI inference (CLAUDE.md §13
    // hackathon deployment — no queue/worker), which dominates the
    // remaining ~7-10s. There's no real progress channel from a single
    // server action call, so this switches to a second, honestly-labeled
    // phase after a short delay rather than leaving one bare "Submitting…"
    // spinner for the whole wait with no indication of why it's slow.
    const analyzingTimer = setTimeout(() => setStatus("analyzing"), 1500);

    let result: Awaited<ReturnType<typeof submitComplaintAction>>;
    try {
      result = await submitComplaintAction(formData);
    } catch {
      result = { ok: false, error: "Something went wrong submitting your complaint. Try again." };
    } finally {
      clearTimeout(analyzingTimer);
    }

    if (result.ok && result.complaintNumber) {
      onSubmitted(result.complaintNumber);
    } else {
      setStatus("error");
      setError(result.error ?? "Could not submit your complaint. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Review &amp; submit</h2>
        <p className="text-sm text-muted-foreground">Check everything below, then submit your report.</p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">Photos</h3>
        <div className="flex flex-wrap gap-3">
          {photos
            .filter((p) => p.status === "ok")
            .map((photo) => (
              <div key={photo.id} className="h-24 w-24 overflow-hidden rounded-lg border border-border">
                {photo.previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- transient client-side blob:/data: preview, not an optimizable static asset
                  <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            ))}
        </div>
      </section>

      {description && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Description</h3>
          <p className="text-sm">{description}</p>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">Location</h3>
        <div className="rounded-lg border border-border">
          <LocationMap lat={location.lat} lng={location.lng} onPositionChange={() => {}} disabled />
        </div>
        {addressLine && <p className="text-sm">{addressLine}</p>}
        {location.landmark && <p className="text-sm text-muted-foreground">{location.landmark}</p>}
        <p className="text-xs text-muted-foreground">
          {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)} · Location consent given
        </p>
      </section>

      <FormMessage error={error ?? undefined} />

      <Button type="button" size="lg" onClick={() => void handleSubmit()} disabled={status === "uploading" || status === "analyzing"}>
        {status === "uploading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading your photo{photos.length > 1 ? "s" : ""}…
          </>
        ) : status === "analyzing" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Running automatic debris detection… (up to ~10s)
          </>
        ) : (
          "Submit complaint"
        )}
      </Button>
      {status === "analyzing" && (
        <p className="text-center text-xs text-muted-foreground">
          Hang tight — we&apos;re checking your photo for known debris types before handing it to our review team.
        </p>
      )}
    </div>
  );
}
