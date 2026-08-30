import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Second, independent enforcement layer for the admin surface (CLAUDE.md §0:
 * "structurally incapable", not just proxy.ts). Every request under
 * /admin/** re-checks the session here regardless of what proxy.ts decided —
 * a citizen session can never render anything under this layout.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return <>{children}</>;
}
