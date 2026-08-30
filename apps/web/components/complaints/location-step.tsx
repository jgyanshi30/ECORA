"use client";

import * as exifr from "exifr";
import { Loader2, MapPin, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EvidencePhoto } from "@/components/complaints/evidence-step";
import { getCurrentPosition } from "@/lib/complaints/geolocation";
import { reverseGeocodeAction, searchAddressAction } from "@/lib/complaints/actions/geocode";
import type { AddressSearchResult } from "@/lib/geocoding/nominatim";

// react-leaflet accesses window/document at mount — not SSR-safe.
const LocationMap = dynamic(() => import("./location-map").then((mod) => mod.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-lg border border-border bg-muted">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export interface LocationData {
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
  altitudeMeters: number | null;
  capturedAt: string | null;
  /** From the photo's own EXIF GPS tag, kept separate from the user-confirmed pin (CLAUDE.md §5 Locations schema). */
  exifLat: number | null;
  exifLng: number | null;
  locality: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  landmark: string;
  consentGiven: boolean;
}

export const EMPTY_LOCATION: LocationData = {
  lat: null,
  lng: null,
  accuracyMeters: null,
  altitudeMeters: null,
  capturedAt: null,
  exifLat: null,
  exifLng: null,
  locality: "",
  city: "",
  district: "",
  state: "",
  pinCode: "",
  landmark: "",
  consentGiven: false,
};

export interface LocationStepProps {
  photos: EvidencePhoto[];
  location: LocationData;
  onLocationChange: Dispatch<SetStateAction<LocationData>>;
}

type GeoStatus = "idle" | "requesting" | "denied" | "unavailable";

export function LocationStep({ photos, location, onLocationChange }: LocationStepProps) {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [exifSuggestion, setExifSuggestion] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "error">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  const disabled = !location.consentGiven;

  // Opportunistic: check the validated evidence photos for embedded GPS EXIF.
  // Never auto-applied — surfaced as a button the citizen explicitly clicks,
  // same "explicit action" bar as every other way of setting a location here.
  useEffect(() => {
    let cancelled = false;
    async function checkExif() {
      for (const photo of photos) {
        if (photo.status !== "ok") continue;
        try {
          const gps = await exifr.gps(photo.file);
          if (gps && !cancelled) {
            setExifSuggestion({ lat: gps.latitude, lng: gps.longitude });
            onLocationChange((current) => ({ ...current, exifLat: gps.latitude, exifLng: gps.longitude }));
            return;
          }
        } catch {
          // No GPS EXIF in this photo — try the next one.
        }
      }
      if (!cancelled) setExifSuggestion(null);
    }
    void checkExif();
    return () => {
      cancelled = true;
    };
  }, [photos, onLocationChange]);

  async function applyPosition(
    lat: number,
    lng: number,
    extra: Pick<LocationData, "accuracyMeters" | "altitudeMeters" | "capturedAt">
  ) {
    onLocationChange((current) => ({ ...current, lat, lng, ...extra }));
    const result = await reverseGeocodeAction(lat, lng);
    if (result.ok && result.address) {
      const address = result.address;
      onLocationChange((current) => ({
        ...current,
        locality: address.locality,
        city: address.city,
        district: address.district,
        state: address.state,
        pinCode: address.pinCode,
      }));
    }
  }

  async function handleUseMyLocation() {
    if (disabled) return;
    setGeoStatus("requesting");
    const result = await getCurrentPosition();
    if (result.ok) {
      setGeoStatus("idle");
      await applyPosition(result.data.lat, result.data.lng, {
        accuracyMeters: result.data.accuracyMeters,
        altitudeMeters: result.data.altitudeMeters,
        capturedAt: result.data.capturedAt,
      });
    } else {
      setGeoStatus(result.reason === "denied" ? "denied" : "unavailable");
    }
  }

  function handleMapPositionChange(lat: number, lng: number) {
    void applyPosition(lat, lng, { accuracyMeters: null, altitudeMeters: null, capturedAt: new Date().toISOString() });
  }

  async function handleUseExifSuggestion() {
    if (disabled || !exifSuggestion) return;
    await applyPosition(exifSuggestion.lat, exifSuggestion.lng, {
      accuracyMeters: null,
      altitudeMeters: null,
      capturedAt: new Date().toISOString(),
    });
  }

  async function handleSearch() {
    setSearchStatus("searching");
    setSearchError(null);
    const result = await searchAddressAction(searchQuery);
    if (result.ok) {
      setSearchResults(result.results);
      setSearchStatus("idle");
      if (result.results.length === 0) setSearchError("No matches found. Try a different search.");
    } else {
      setSearchResults([]);
      setSearchStatus("error");
      setSearchError(result.error ?? "Search failed.");
    }
  }

  function handleSelectSearchResult(result: AddressSearchResult) {
    onLocationChange((current) => ({
      ...current,
      lat: result.lat,
      lng: result.lng,
      accuracyMeters: null,
      altitudeMeters: null,
      capturedAt: new Date().toISOString(),
      locality: result.locality,
      city: result.city,
      district: result.district,
      state: result.state,
      pinCode: result.pinCode,
    }));
    setSearchResults([]);
    setSearchQuery(result.displayName);
  }

  function updateField<K extends keyof LocationData>(key: K, value: LocationData[K]) {
    onLocationChange((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Location</h2>
        <p className="text-sm text-muted-foreground">Where did you see the debris?</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
        <Checkbox
          id="location-consent"
          checked={location.consentGiven}
          onCheckedChange={(checked) => updateField("consentGiven", checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="location-consent" className="text-sm font-normal leading-snug">
          I consent to Ecora collecting my location (from GPS, the map, or a photo) to attach to
          this complaint. Exact coordinates are only ever visible to administrators — see our{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-primary hover:underline">
            privacy notice
          </a>
          .
        </Label>
      </div>

      <div className={disabled ? "pointer-events-none opacity-50" : undefined} aria-disabled={disabled}>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => void handleUseMyLocation()} disabled={disabled || geoStatus === "requesting"}>
            {geoStatus === "requesting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Use my current location
          </Button>

          {exifSuggestion && (
            <Button type="button" variant="outline" onClick={() => void handleUseExifSuggestion()} disabled={disabled}>
              Use location from photo
            </Button>
          )}
        </div>

        {geoStatus === "denied" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Location access wasn&apos;t granted — no problem, tap the map below to drop a pin or search for
            an address instead.
          </p>
        )}
        {geoStatus === "unavailable" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Couldn&apos;t detect your location — tap the map below to drop a pin or search for an address
            instead.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Search for an address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSearch();
              }
            }}
            disabled={disabled}
          />
          <Button type="button" variant="outline" onClick={() => void handleSearch()} disabled={disabled || searchStatus === "searching"}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {searchError && <p className="mt-1 text-sm text-muted-foreground">{searchError}</p>}
        {searchResults.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
            {searchResults.map((result, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <LocationMap lat={location.lat} lng={location.lng} onPositionChange={handleMapPositionChange} disabled={disabled} />
        </div>

        {location.lat !== null && location.lng !== null && (
          <p className="mt-2 text-xs text-muted-foreground">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            {location.accuracyMeters !== null && ` · accuracy ±${Math.round(location.accuracyMeters)}m`}
            {location.altitudeMeters !== null && ` · altitude ${Math.round(location.altitudeMeters)}m`}
            {location.capturedAt && ` · captured ${new Date(location.capturedAt).toLocaleTimeString()}`}
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="locality">Locality</Label>
            <Input id="locality" value={location.locality} onChange={(e) => updateField("locality", e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={location.city} onChange={(e) => updateField("city", e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="district">District</Label>
            <Input id="district" value={location.district} onChange={(e) => updateField("district", e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={location.state} onChange={(e) => updateField("state", e.target.value)} disabled={disabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pinCode">PIN code</Label>
            <Input id="pinCode" value={location.pinCode} onChange={(e) => updateField("pinCode", e.target.value)} disabled={disabled} />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="landmark">Landmark / location instructions (optional)</Label>
          <textarea
            id="landmark"
            value={location.landmark}
            onChange={(e) => updateField("landmark", e.target.value)}
            disabled={disabled}
            rows={2}
            maxLength={500}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="e.g. Near the fishing jetty, behind the blue boat shed"
          />
        </div>
      </div>
    </div>
  );
}
