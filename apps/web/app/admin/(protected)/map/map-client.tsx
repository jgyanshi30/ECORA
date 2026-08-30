"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getMarkerColor } from "@/components/domain/map-marker-color";
import type { MapBoundsBox } from "@/components/complaints/complaints-map";
import type { AdminMapPoint } from "@/lib/admin/map";

const ComplaintsMap = dynamic(() => import("@/components/complaints/complaints-map").then((m) => m.ComplaintsMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full items-center justify-center rounded-lg border border-border bg-muted">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

/** Region-select is "whatever the map viewport currently shows" (CLAUDE.md §9's "region-select + export complaints in this region") — pan/zoom to the area you want, then export; no separate rectangle-drawing tool. */
export function AdminMapClient({ points }: { points: AdminMapPoint[] }) {
  const [heatmap, setHeatmap] = useState(false);
  const [bounds, setBounds] = useState<MapBoundsBox | null>(null);

  const mapPoints = points.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    color: getMarkerColor(p.status, p.riskLevel),
    label: `${p.complaintNumber} — ${p.status.replaceAll("_", " ")}${p.riskLevel ? ` — ${p.riskLevel} risk` : ""}`,
  }));

  const exportUrl = bounds
    ? `/api/admin/complaints/export?minLat=${bounds.minLat}&maxLat=${bounds.maxLat}&minLng=${bounds.minLng}&maxLng=${bounds.maxLng}`
    : "/api/admin/complaints/export";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant={heatmap ? "default" : "outline"} size="sm" onClick={() => setHeatmap((h) => !h)}>
          {heatmap ? "Showing heatmap" : "Show heatmap"}
        </Button>
        <a href={exportUrl} className="text-sm text-primary hover:underline">
          Export complaints in the current view as CSV
        </a>
      </div>
      <ComplaintsMap points={mapPoints} heatmap={heatmap} onBoundsChange={setBounds} heightClass="h-[600px]" />
    </div>
  );
}
