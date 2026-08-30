import { z } from "zod";

/**
 * Server-side re-validation of the location step's state (CLAUDE.md §0: role/
 * consent boundaries are enforced server-side, never trusted from client
 * state alone). `consentGiven` must be the literal `true` — a citizen who
 * never checked the consent box cannot submit a location no matter what the
 * client sends.
 *
 * The submit action receives this as a single JSON-encoded FormData field
 * (`JSON.parse` preserves real number/null/boolean types) rather than
 * individual string form fields, so no string-coercion layer is needed here.
 */
export const locationSubmissionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyMeters: z.number().nullable(),
  altitudeMeters: z.number().nullable(),
  capturedAt: z.string().nullable(),
  exifLat: z.number().nullable(),
  exifLng: z.number().nullable(),
  locality: z.string().trim().max(200),
  city: z.string().trim().max(200),
  district: z.string().trim().max(200),
  state: z.string().trim().max(200),
  pinCode: z.string().trim().max(20),
  landmark: z.string().trim().max(500),
  consentGiven: z.literal(true, { message: "Location consent is required." }),
});

export const complaintDescriptionSchema = z.string().trim().max(2000);
