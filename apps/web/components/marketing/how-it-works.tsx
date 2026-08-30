import { Camera, ScanSearch, ShieldCheck } from "lucide-react";

const STEPS = [
  {
    icon: Camera,
    title: "1. Report",
    description: "Snap a photo of the debris, confirm the location, and add a short description.",
  },
  {
    icon: ScanSearch,
    title: "2. AI-assisted triage",
    description:
      "Automated detection flags the debris type and helps route your report for review — a starting point for admins, not a final verdict.",
  },
  {
    icon: ShieldCheck,
    title: "3. Verified action",
    description:
      "An administrator reviews the report, assesses risk, and coordinates cleanup. You get status updates along the way.",
  },
];

export function HowItWorks() {
  return (
    <section className="container py-16">
      <h2 className="text-center text-2xl font-bold tracking-tight">How it works</h2>
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.title} className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <step.icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
