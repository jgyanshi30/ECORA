import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAnalytics } from "@/lib/admin/analytics";

import { BarList } from "./bar-list";
import { TrendChart } from "./trend-chart";

export const metadata: Metadata = { title: "Analytics — Ecora admin" };

// Real DB queries every request — an analytics dashboard showing stale
// build-time numbers would be worse than useless (see PROGRESS.md's step-5
// entry on the same static-prerendering trap).
export const dynamic = "force-dynamic";

const RISK_COLORS: Record<string, string> = { LOW: "#16a34a", MEDIUM: "#d97706", HIGH: "#dc2626", CRITICAL: "#991b1b" };
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#d97706",
  AI_ANALYSIS_PENDING: "#d97706",
  UNDER_REVIEW: "#2563eb",
  ASSIGNED: "#2563eb",
  ACTION_IN_PROGRESS: "#9333ea",
  RESOLVED: "#16a34a",
  CLOSED: "#64748b",
  REJECTED_DUPLICATE: "#64748b",
};

export default async function AdminAnalyticsPage() {
  const data = await getAdminAnalytics();

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <Button asChild variant="outline">
          <Link href="/admin">Back to overview</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total complaints</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{data.totalComplaints}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. time to resolution ({data.resolvedCount} resolved)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.avgResolutionDays !== null ? `${data.avgResolutionDays.toFixed(1)}d` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. citizen satisfaction ({data.ratingCount} ratings)</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {data.avgSatisfactionRating !== null ? `${data.avgSatisfactionRating.toFixed(1)} / 5` : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions, last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={data.submissionsByDay} days={30} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={Object.entries(data.statusBreakdown).map(([status, count]) => ({
                label: status.replaceAll("_", " "),
                count,
                color: STATUS_COLORS[status],
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk breakdown (current assessments)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={Object.entries(data.riskBreakdown).map(([level, count]) => ({
                label: level,
                count,
                color: RISK_COLORS[level],
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most-reported debris categories</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={data.debrisClassBreakdown.slice(0, 10).map((d) => ({ label: d.className, count: d.count }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top cities</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={data.topCities.map((c) => ({ label: c.city, count: c.count }))} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
