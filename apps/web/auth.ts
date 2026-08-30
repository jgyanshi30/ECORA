import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { NextResponse } from "next/server";

import { RateLimitExceededError, verifyCredentials } from "@/lib/auth/verify-credentials";
import { loginSchema } from "@/lib/validation/auth";

export class RateLimitedSignin extends CredentialsSignin {
  code = "RateLimited";
}

/**
 * CLAUDE.md §11 rate limiting, applied at the one chokepoint every credentials
 * sign-in funnels through — direct hits to /api/auth/callback/credentials
 * bypass lib/auth/actions/login.ts entirely, so that action's own rate check
 * is a fast pre-check only, not the authoritative one.
 */
function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // CLAUDE.md §1: "credentials + JWT session" — no server-side session store.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        let user;
        try {
          user = await verifyCredentials(parsed.data.email, parsed.data.password, getRequestIp(request));
        } catch (error) {
          if (error instanceof RateLimitExceededError) throw new RateLimitedSignin();
          throw error;
        }
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    // CLAUDE.md §0/§1 role boundary: this is the server-side gate for every
    // request proxy.ts matches — never just a UI redirect. Unauthenticated
    // page requests to /admin bounce to the admin login page (API requests
    // get 401 JSON, since there's no page to redirect an API caller to);
    // authenticated requests from a non-admin role always get a hard 403,
    // never a login redirect (a logged-in citizen isn't "not logged in" —
    // redirecting them to /admin/login would just loop or mislead).
    authorized({ request, auth: session }) {
      const { pathname } = request.nextUrl;
      const isAdminApi = pathname.startsWith("/api/admin");
      const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
      if (!isAdminApi && !isAdminPage) return true;

      if (!session?.user) {
        if (isAdminApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }
      if (session.user.role !== "admin") {
        if (isAdminApi) return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
        return NextResponse.redirect(new URL("/", request.url));
      }
      return true;
    },
  },
});
