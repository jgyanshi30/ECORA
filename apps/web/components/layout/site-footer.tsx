import Link from "next/link";

/** CLAUDE.md §11: a visible privacy notice is required — surfaced here so it's
 * present on every page that composes this footer, not just the forms that
 * collect data. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container flex flex-col gap-6 py-8 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p>&copy; {new Date().getFullYear()} Ecora. All rights reserved.</p>
          <p className="max-w-md">
            By using this platform you consent to location and image data being collected as part of your
            complaint submission. See our privacy notice for details.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/track" className="hover:text-foreground">
            Track a complaint
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy notice
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of use
          </Link>
          <a href="mailto:support@ecora.example" className="hover:text-foreground">
            Contact support
          </a>
        </nav>
      </div>
    </footer>
  );
}
