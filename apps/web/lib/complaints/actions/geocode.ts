"use server";

import { auth } from "@/auth";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { type AddressSearchResult, type GeocodedAddress, reverseGeocode, searchAddress } from "@/lib/geocoding/nominatim";
import { getClientIp } from "@/lib/request-ip";

export interface GeocodeActionResult {
  ok: boolean;
  error?: string;
  address?: GeocodedAddress;
}

export async function reverseGeocodeAction(lat: number, lng: number): Promise<GeocodeActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "You must be signed in." };

  const ip = await getClientIp();
  // Nominatim's usage policy caps at ~1 req/sec; this is a per-caller
  // throttle on top of that, generous enough for normal wizard use (drag
  // the pin, click the map) without hammering the public endpoint.
  if (!checkRateLimit(`geocode:${ip}`, 20, 60 * 1000).allowed) {
    return { ok: false, error: "Too many location lookups. Wait a moment and try again." };
  }

  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: "Invalid coordinates." };
  }

  try {
    const address = await reverseGeocode(lat, lng);
    if (!address) return { ok: false, error: "Could not look up an address for this location." };
    return { ok: true, address };
  } catch {
    return { ok: false, error: "Address lookup failed. You can still fill in the address manually." };
  }
}

export interface SearchActionResult {
  ok: boolean;
  error?: string;
  results: AddressSearchResult[];
}

export async function searchAddressAction(query: string): Promise<SearchActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "You must be signed in.", results: [] };

  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Enter at least 3 characters to search.", results: [] };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`geocode:${ip}`, 20, 60 * 1000).allowed) {
    return { ok: false, error: "Too many location lookups. Wait a moment and try again.", results: [] };
  }

  try {
    const results = await searchAddress(trimmed);
    return { ok: true, results };
  } catch {
    return { ok: false, error: "Address search failed. Try again or enter the address manually.", results: [] };
  }
}
