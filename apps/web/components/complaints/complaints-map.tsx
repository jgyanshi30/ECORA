"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

// CLAUDE.md §9 map defaults.
const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
const INDIA_ZOOM = 4.5;

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
}

export interface MapBoundsBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ComplaintsMapProps {
  points: MapPoint[];
  heatmap?: boolean;
  onBoundsChange?: (bounds: MapBoundsBox) => void;
  heightClass?: string;
}

/** Imperative — leaflet.heat has no react-leaflet wrapper; a real gradient heat layer, not a fake overlay. */
function HeatLayer({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- leaflet.heat augments the L namespace with no first-party types beyond @types/leaflet.heat's own loose shape
    const heatLayer = (L as any).heatLayer(
      points.map((p) => [p.lat, p.lng, 0.5]),
      { radius: 25, blur: 20 }
    );
    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);
  return null;
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bounds: MapBoundsBox) => void }) {
  const map = useMap();
  useEffect(() => {
    function report() {
      const b = map.getBounds();
      onBoundsChange({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
    }
    report();
    map.on("moveend", report);
    return () => {
      map.off("moveend", report);
    };
  }, [map, onBoundsChange]);
  return null;
}

/**
 * The shared multi-point overview map (CLAUDE.md §9) — used by both the
 * public map and the admin map (CLAUDE.md §12: one component, not forked
 * per-role). Callers control what's admin-only (heatmap toggle, region
 * export, exact vs. jittered coordinates) — this component just renders
 * whatever points it's given.
 */
export function ComplaintsMap({ points, heatmap = false, onBoundsChange, heightClass = "h-[500px]" }: ComplaintsMapProps) {
  // react-leaflet-cluster (leaflet.markercluster under the hood) only
  // clusters real L.Marker layers — it relies on each layer having a
  // replaceable icon/_icon, which a vector layer like CircleMarker doesn't
  // have. An earlier version used CircleMarker here and clustering silently
  // never activated (caught by browser-testing for an actual `.marker-
  // cluster`/marker element, not just "does something render"). Colored
  // divIcons on real Markers give both the colored dot AND working
  // clustering. Recomputed (not ref-cached) per distinct color set — cheap,
  // and React 19's stricter rules disallow reading a ref during render even
  // inside useMemo.
  const icons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    for (const p of points) {
      if (!cache.has(p.color)) {
        cache.set(
          p.color,
          L.divIcon({
            className: "",
            html: `<div style="width:14px;height:14px;border-radius:9999px;background:${p.color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,0.5)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          })
        );
      }
    }
    return cache;
  }, [points]);

  return (
    <MapContainer center={INDIA_CENTER} zoom={INDIA_ZOOM} className={`w-full ${heightClass}`} style={{ borderRadius: "0.5rem" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {heatmap ? (
        <HeatLayer points={points} />
      ) : (
        <MarkerClusterGroup chunkedLoading>
          {points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={icons.get(p.color)}>
              <Popup>{p.label}</Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
      {onBoundsChange && <BoundsWatcher onBoundsChange={onBoundsChange} />}
    </MapContainer>
  );
}
