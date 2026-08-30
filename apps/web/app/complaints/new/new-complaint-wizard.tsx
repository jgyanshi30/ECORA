"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { EvidenceStep, type EvidencePhoto } from "@/components/complaints/evidence-step";
import { EMPTY_LOCATION, LocationStep, type LocationData } from "@/components/complaints/location-step";
import { ReviewStep } from "@/components/complaints/review-step";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const STEP_LABELS = { 1: "Evidence", 2: "Location", 3: "Review" } as const;
const TOTAL_STEPS = 3;

type Step = 1 | 2 | 3;

/**
 * Step 5c checkpoint: evidence, location, and review/submit are all wired
 * up. Both Continue buttons are now real — step 2's used to be permanently
 * disabled with a "review doesn't exist yet" tooltip, but that reason no
 * longer applies now that step 3 exists.
 */
export function NewComplaintWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationData>(EMPTY_LOCATION);

  const hasBlockingErrors = photos.some((p) => p.status === "error");
  const isValidating = photos.some((p) => p.status === "validating");
  const evidenceValid = photos.length > 0 && !hasBlockingErrors && !isValidating;
  const locationValid = location.lat !== null && location.lng !== null && location.consentGiven;

  function handleSubmitted(complaintNumber: string) {
    router.push(`/complaints/success?number=${encodeURIComponent(complaintNumber)}`);
  }

  return (
    <TooltipProvider>
      <Card className="mx-auto max-w-2xl">
        <CardContent className="pt-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step]}
          </p>

          {step === 1 && (
            <EvidenceStep
              photos={photos}
              onPhotosChange={setPhotos}
              description={description}
              onDescriptionChange={setDescription}
            />
          )}
          {step === 2 && <LocationStep photos={photos} location={location} onLocationChange={setLocation} />}
          {step === 3 && (
            <ReviewStep photos={photos} description={description} location={location} onSubmitted={handleSubmitted} />
          )}

          <div className="mt-8 flex justify-between">
            {step === 2 || step === 3 ? (
              <Button type="button" variant="outline" onClick={() => setStep((step - 1) as Step)}>
                Back
              </Button>
            ) : (
              <span />
            )}

            {step === 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={evidenceValid ? -1 : 0}>
                    <Button disabled={!evidenceValid} onClick={() => setStep(2)}>
                      Continue
                    </Button>
                  </span>
                </TooltipTrigger>
                {!evidenceValid && <TooltipContent>Add at least one valid photo to continue</TooltipContent>}
              </Tooltip>
            )}

            {step === 2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={locationValid ? -1 : 0}>
                    <Button disabled={!locationValid} onClick={() => setStep(3)}>
                      Continue
                    </Button>
                  </span>
                </TooltipTrigger>
                {!locationValid && <TooltipContent>Set a location and confirm consent to continue</TooltipContent>}
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
