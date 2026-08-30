import Link from "next/link";

import { Button } from "@/components/ui/button";

import { HeroWave } from "./hero-wave";

export interface HeroProps {
  reportHref: string;
  reportLabel: string;
}

export function Hero({ reportHref, reportLabel }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-50 to-background">
      <HeroWave />
      <div className="container relative z-10 flex flex-col items-center gap-6 py-20 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Report underwater and environmental debris — help clean up India&apos;s waterways
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Snap a photo, confirm the location, and Ecora&apos;s AI-assisted triage helps our
          administrators review and act on it faster.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href={reportHref}>{reportLabel}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/track">Track a complaint</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
