import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getTreatmentRecommendations, TREATMENT_CATEGORIES } from "@/lib/admin/treatment-recommendations";

import { RecommendationRow } from "./recommendation-row";

export const metadata: Metadata = { title: "Treatment recommendations — Ecora admin" };

// Reflects the most recent admin edit — never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function AdminTreatmentRecommendationsPage() {
  const recommendations = await getTreatmentRecommendations();

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Treatment recommendations</h1>
          <p className="text-sm text-muted-foreground">
            Operational recommendations requiring admin verification — never automatic instructions (CLAUDE.md §8).
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-8">
        {TREATMENT_CATEGORIES.map((category) => (
          <section key={category.label} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">{category.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {category.classNames.map((className) => {
                const row = recommendations.get(className);
                if (!row) return null;
                return (
                  <RecommendationRow
                    key={className}
                    className={row.className}
                    recommendation={row.recommendation}
                    updatedByName={row.updatedByName}
                    updatedAt={row.updatedAt}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
