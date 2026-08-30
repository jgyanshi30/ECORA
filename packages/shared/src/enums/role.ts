/**
 * Roles are structural, not cosmetic: every protected route/API call verifies
 * this claim server-side (CLAUDE.md §1, §5). A citizen must be structurally
 * incapable of reaching admin surfaces — never enforced by hiding UI alone.
 */
export const Role = {
  CITIZEN: "citizen",
  ADMIN: "admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLES: readonly Role[] = Object.values(Role);

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
