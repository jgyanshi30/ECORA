"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { getMarkerColor } from "@/components/domain/map-marker-color";
import type { PublicMapPoint } from "@/lib/map/public-map";

const ComplaintsMap = dynamic(() => import("@/components/complaints/complaints-map").then((m) => m.ComplaintsMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center rounded-lg border border-border bg-muted">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

export function PublicMapClient({ points }: { points: PublicMapPoint[] }) {
  const mapPoints = points.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    color: getMarkerColor(p.status),
    label: p.status.replaceAll("_", " "),
  }));

  return <ComplaintsMap points={mapPoints} heightClass="h-[600px]" />;
}
