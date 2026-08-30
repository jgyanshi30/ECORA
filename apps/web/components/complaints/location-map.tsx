"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

// Local copies under public/leaflet/ — Leaflet's default marker icon paths
// don't resolve correctly through bundlers (a well-known Leaflet+webpack/
// Turbopack issue), so these are served as plain static files instead of
// relying on Leaflet's own relative image URLs.
const markerIcon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// CLAUDE.md §9 map defaults.
const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
const INDIA_ZOOM = 4.5;
const PIN_ZOOM = 16;

export interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  onPositionChange: (lat: number, lng: number) => void;
  /** Map interaction (click/drag) is a location-collection action — gated on consent, same as the "use my location" button. */
  disabled?: boolean;
}

function ClickHandler({ onPositionChange, disabled }: { onPositionChange: (lat: number, lng: number) => void; disabled?: boolean }) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * react-leaflet's MapContainer only reads `center`/`zoom` at initial mount —
 * they are not reactive props (a documented react-leaflet gotcha). Anything
 * that needs to programmatically move the already-mounted map (GPS result,
 * search selection, EXIF suggestion) has to do it imperatively via useMap().
 */
function RecenterOnChange({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.setView([lat, lng], Math.max(map.getZoom(), PIN_ZOOM));
    }
  }, [lat, lng, map]);
  return null;
}

export function LocationMap({ lat, lng, onPositionChange, disabled }: LocationMapProps) {
  const hasPosition = lat !== null && lng !== null;

  return (
    // `disabled`-driven styling lives on this plain wrapper div, NOT on
    // MapContainer's own `className` prop — confirmed by reading
    // react-leaflet's MapContainer source: it does `const [props] =
    // useState({ className, id, style })` and never updates that state, so
    // className (like center/zoom) is only ever applied at first mount. The
    // map's very first render is almost always with disabled=true (consent
    // isn't checked yet), so a className passed straight to MapContainer
    // would freeze it pointer-events-none forever — real bug, caught by
    // browser-testing the "check consent, then use the map" order, not just
    // the "GPS button" happy path. A plain div's className has no such
    // limitation.
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <MapContainer
        center={hasPosition ? [lat, lng] : INDIA_CENTER}
        zoom={hasPosition ? PIN_ZOOM : INDIA_ZOOM}
        style={{ height: "320px", width: "100%", borderRadius: "0.5rem" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClickHandler onPositionChange={onPositionChange} disabled={disabled} />
        {hasPosition && (
          <Marker
            position={[lat, lng]}
            draggable={!disabled}
            icon={markerIcon}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target as L.Marker;
                const position = marker.getLatLng();
                onPositionChange(position.lat, position.lng);
              },
            }}
          />
        )}
        <RecenterOnChange lat={lat} lng={lng} />
      </MapContainer>
    </div>
  );
}
