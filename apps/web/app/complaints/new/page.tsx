import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { NewComplaintWizard } from "./new-complaint-wizard";

export const metadata: Metadata = { title: "Submit a complaint — Ecora" };

// CLAUDE.md §13: this page's ReviewStep calls submitComplaintAction, which
// now runs AI inference synchronously in-request (real measured time ~7s,
// see PROGRESS.md) instead of enqueueing a background job. A Server
// Action's maxDuration is set on the route segment (page/layout) that
// invokes it, NOT on the "use server" action file itself — Next.js has no
// other hook for it. Vercel's own current Hobby-plan default already
// covers this comfortably, but this is set explicitly (not left to
// whatever the platform default happens to be) so a future lower default,
// a slower cold inference-service start, or a larger image doesn't
// silently regress into a production-only timeout that never reproduces
// locally.
export const maxDuration = 60;

export default async function NewComplaintPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="container py-12">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold tracking-tight">Report debris</h1>
      </div>
      <NewComplaintWizard />
    </main>
  );
}
