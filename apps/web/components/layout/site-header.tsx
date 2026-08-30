import Link from "next/link";
import type { ReactNode } from "react";

export interface SiteHeaderProps {
  nav?: { label: string; href: string }[];
  /** Right-aligned slot — e.g. auth actions, wired in once those routes exist. */
  actions?: ReactNode;
}

/** Reusable top-level shell for marketing/citizen surfaces (CLAUDE.md §2 layout shell).
 * Admin surfaces will likely use a different chrome (sidebar nav) — this is not
 * force-shared across roles, only the underlying ui/domain primitives are. */
export function SiteHeader({ nav = [], actions }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            E
          </span>
          <span>Ecora</span>
        </Link>

        {nav.length > 0 && (
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
