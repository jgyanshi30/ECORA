/**
 * CLAUDE.md §9: Leaflet + OSM by default. Nominatim is OSM's own geocoder —
 * the natural, no-API-key-needed choice consistent with that default, not a
 * new provider decision on top of the still-open Mapbox-vs-OSM question
 * (§13, which is about *tile* provider, not geocoding).
 *
 * Usage policy (https://operations.osmfoundation.org/policies/nominatim/):
 * a descriptive User-Agent identifying the app, and max ~1 request/second —
 * both handled by routing every call through the server actions in
 * lib/complaints/actions/geocode.ts (never called directly from the
 * browser), which also rate-limit per caller. At real production scale this
 * public endpoint would need to move to a self-hosted Nominatim instance or
 * a paid provider — noted here, not solved here.
 */

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Ecora/0.1 (debris-reporting platform; contact: support@ecora.example)";

export interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  village?: string;
  hamlet?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
}

export interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
}

export interface GeocodedAddress {
  locality: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  displayName: string;
}

/** Best-effort mapping — India's address hierarchy varies by region, so this
 * is a starting point for the citizen to edit, never treated as authoritative. */
function mapAddress(address: NominatimAddress | undefined, displayName: string): GeocodedAddress {
  return {
    locality: address?.suburb ?? address?.neighbourhood ?? address?.village ?? address?.hamlet ?? "",
    city: address?.city ?? address?.town ?? address?.municipality ?? "",
    district: address?.state_district ?? address?.county ?? "",
    state: address?.state ?? "",
    pinCode: address?.postcode ?? "",
    displayName,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress | null> {
  const url = `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) return null;

  const result = (await response.json()) as NominatimResult | { error: string };
  if ("error" in result) return null;

  return mapAddress(result.address, result.display_name);
}

export interface AddressSearchResult extends GeocodedAddress {
  lat: number;
  lng: number;
}

export async function searchAddress(query: string): Promise<AddressSearchResult[]> {
  const url = `${NOMINATIM_BASE_URL}/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=5`;
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) return [];

  const results = (await response.json()) as NominatimResult[];
  return results.map((result) => ({
    ...mapAddress(result.address, result.display_name),
    lat: Number(result.lat),
    lng: Number(result.lon),
  }));
}
