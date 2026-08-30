import { Badge } from "@/components/ui/badge";

const DEMO_STATS = [
  { value: "500+", label: "Reports submitted" },
  { value: "1,200 kg", label: "Debris logged for cleanup" },
  { value: "42", label: "Water bodies covered" },
];

/**
 * CLAUDE.md §0: "Landing-page stats... must be clearly labeled Demo data /
 * Sample data... whenever they are not backed by a real query." No
 * submission flow exists yet, so there is no real volume to query — these
 * are illustrative placeholder numbers, labeled as such twice (section
 * heading badge + caption) rather than presented as live statistics.
 */
export function ImpactStats() {
  return (
    <section className="container py-16">
      <div className="flex items-center justify-center gap-2">
        <h2 className="text-center text-2xl font-bold tracking-tight">Our impact so far</h2>
        <Badge variant="outline">Demo data</Badge>
      </div>
      <div className="mx-auto mt-10 grid max-w-2xl gap-8 sm:grid-cols-3">
        {DEMO_STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-bold text-primary-700">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-6 max-w-lg text-center text-xs text-muted-foreground">
        These are illustrative example numbers, not live statistics — Ecora is a new
        platform and doesn&apos;t yet have real reporting volume to show.
      </p>
    </section>
  );
}
