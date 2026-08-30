import type { Metadata } from "next";

import { EmptyState } from "@/components/domain/empty-state";
import { getPublicMapPoints } from "@/lib/map/public-map";

import { PublicMapClient } from "./map-client";

export const metadata: Metadata = { title: "Complaint map — Ecora" };

// Real bug caught during this step's build: with no searchParams/cookies
// dependency, Next statically prerendered this page — freezing
// getPublicMapPoints()'s result at BUILD time forever, so new complaints
// would never appear without a redeploy. Force dynamic rendering so every
// request re-queries the DB, matching every other complaint-listing page.
export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated map (CLAUDE.md §9) — every point is jittered
 * server-side (CLAUDE.md §0) before this page ever receives it; no exact
 * coordinates, no citizen identity, no risk/admin detail ever reach this
 * page's markup.
 */
export default async function PublicMapPage() {
  const points = await getPublicMapPoints();

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Debris reports across India</h1>
        <p className="text-sm text-muted-foreground">
          Locations are approximate — Ecora never publishes a citizen&apos;s exact reported
          location.
        </p>
      </div>

      {points.length === 0 ? (
        <EmptyState title="No reports yet" description="Reported debris will appear here once complaints are submitted." />
      ) : (
        <PublicMapClient points={points} />
      )}

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Under review
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-600" /> Action in progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Resolved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Closed
        </span>
      </div>
    </main>
  );
}
