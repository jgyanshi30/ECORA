/**
 * The one restrained animated visual anywhere in the app — CLAUDE.md §2:
 * "avoid excessive animations, glassmorphism and decorative elements that
 * reduce usability." A slow, quiet wave drifting behind the hero copy is
 * decoration in service of trust/professionalism (this is a debris-cleanup
 * product; water is the whole point), not a demo-reel effect — and it never
 * appears anywhere else (never the submission wizard, dashboard, or any
 * admin screen, all of which stay strictly functional).
 *
 * Two identical copies of the same wave tiled side by side, animated via
 * Tailwind's `animate-wave-drift` utility (tailwind.config.ts) sliding the
 * pair left by exactly one tile-width so the loop is seamless. Pure CSS
 * `transform` animation — the existing global
 * `@media (prefers-reduced-motion: reduce)` rule in app/globals.css already
 * clamps every animation's duration/iteration-count site-wide, so reduced-
 * motion support falls out of that one mechanism for free; this component
 * deliberately adds no second opt-out (no `matchMedia`, no
 * `motion-reduce:` variant).
 *
 * `aria-hidden` + `pointer-events-none`: purely decorative, never focusable
 * or announced, never intercepts clicks/taps on the hero content above it.
 */
export function HeroWave() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 overflow-hidden sm:h-28">
      <div className="flex h-full w-[200%] animate-wave-drift">
        <WaveTile className="text-primary-100" />
        <WaveTile className="text-primary-100" />
      </div>
    </div>
  );
}

function WaveTile({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className={`h-full w-1/2 ${className}`} fill="currentColor">
      <path d="M0,100 C150,150 350,50 600,100 C850,150 1050,50 1200,100 L1200,200 L0,200 Z" />
    </svg>
  );
}
