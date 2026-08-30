import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { getAdminMapPoints } from "@/lib/admin/map";

import { AdminMapClient } from "./map-client";

export const metadata: Metadata = { title: "Complaint map — Ecora admin" };

export default async function AdminMapPage() {
  const points = await getAdminMapPoints();

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Complaint map</h1>
        <Button asChild variant="outline">
          <Link href="/admin/complaints">Back to management</Link>
        </Button>
      </div>

      {points.length === 0 ? (
        <EmptyState title="No complaints yet" />
      ) : (
        <AdminMapClient points={points} />
      )}
    </main>
  );
}
