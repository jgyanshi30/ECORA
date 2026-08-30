import Link from "next/link";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusCounts } from "@/app/dashboard/status-counts";
import { getAdminStatusCounts } from "@/lib/admin/complaints";

export default async function AdminDashboardPage() {
  const session = await auth();
  const counts = await getAdminStatusCounts();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin overview</h1>
          <p className="text-sm text-muted-foreground">Signed in as {session?.user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/complaints">Manage complaints</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/map">Map</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/analytics">Analytics</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/reports">Reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/audit-log">Audit log</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/treatment-recommendations">Treatment recommendations</Link>
          </Button>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <Button type="submit" variant="outline">
              Log out
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All complaints ({total})</CardTitle>
          <CardDescription>Status breakdown across every citizen submission.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusCounts counts={counts} />
        </CardContent>
      </Card>
    </main>
  );
}
