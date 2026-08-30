import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isComplaintStatus } from "@ecora/shared";

import { auth } from "@/auth";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findUserById } from "@/lib/auth/users";
import {
  getCitizenComplaints,
  getCitizenNotifications,
  getCitizenStatusCounts,
  getUpdatesForComplaints,
} from "@/lib/complaints/citizen-dashboard";

import { ComplaintList } from "./complaint-list";
import { FilterForm } from "./filter-form";
import { NotificationsPanel } from "./notifications-panel";
import { StatusCounts } from "./status-counts";

export const metadata: Metadata = { title: "Dashboard — Ecora" };

// Next.js 16: searchParams is a Promise — must be awaited, never read synchronously.
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await findUserById(session.user.id);
  if (!user) redirect("/login");

  const { q, status: rawStatus } = await searchParams;
  const status = rawStatus && isComplaintStatus(rawStatus) ? rawStatus : undefined;
  const hasFilter = Boolean(q || status);

  const [allComplaints, filteredComplaints, statusCounts, notifications] = await Promise.all([
    hasFilter ? getCitizenComplaints(user.id) : Promise.resolve(null),
    getCitizenComplaints(user.id, { q, status }),
    getCitizenStatusCounts(user.id),
    getCitizenNotifications(user.id),
  ]);

  const hasAnyComplaints = hasFilter ? (allComplaints?.length ?? 0) > 0 : filteredComplaints.length > 0;
  const updatesByComplaintId = await getUpdatesForComplaints(filteredComplaints.map((c) => c.id));

  return (
    <main className="container flex flex-col gap-8 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.full_name}</h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your reports.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/complaints/new">Submit New Complaint</Link>
        </Button>
      </div>

      {hasAnyComplaints && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Status overview</h2>
          <StatusCounts counts={statusCounts} />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your complaints</h2>
          </div>

          {!hasAnyComplaints ? (
            <EmptyState
              title="No complaints yet"
              description="When you report debris, it'll show up here with its status and updates."
              action={
                <Button asChild>
                  <Link href="/complaints/new">Submit your first complaint</Link>
                </Button>
              }
            />
          ) : (
            <>
              <FilterForm q={q} status={status} />
              {filteredComplaints.length === 0 ? (
                <EmptyState
                  title="No complaints match your search"
                  description="Try a different search term or status, or clear your filters."
                  action={
                    <Button asChild variant="outline">
                      <Link href="/dashboard">Clear filters</Link>
                    </Button>
                  }
                />
              ) : (
                <ComplaintList complaints={filteredComplaints} updatesByComplaintId={updatesByComplaintId} />
              )}
            </>
          )}
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationsPanel notifications={notifications} />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
