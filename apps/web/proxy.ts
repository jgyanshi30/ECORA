// CLAUDE.md §0/§1 role boundary, first enforcement layer. Next.js 16 renamed
// `middleware.ts` -> `proxy.ts` (the file always runs on the nodejs runtime
// now, never edge). The actual allow/deny decision lives in auth.ts's
// `callbacks.authorized` — see there for the reasoning on redirect vs 403.
//
// This is NOT the only enforcement layer: app/admin/layout.tsx independently
// re-checks the session server-side, so a matcher typo here can't by itself
// open up the admin surface (CLAUDE.md §0: "structurally incapable", not a
// single point of failure).
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
