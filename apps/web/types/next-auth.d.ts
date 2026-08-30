import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "@auth/core/jwt";
import type { Role } from "@ecora/shared";

// CLAUDE.md §1: "role claim (citizen | admin) embedded in the session,
// verified server-side on every protected route/API call."
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "@auth/core/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
  }
}
