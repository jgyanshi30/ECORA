import { Gauge, ListChecks, UserCheck } from "lucide-react";

const BENEFITS = [
  {
    icon: Gauge,
    title: "Faster initial triage",
    description: "Automated detection flags likely debris as soon as a report comes in, ahead of review.",
  },
  {
    icon: ListChecks,
    title: "Consistent categorisation",
    description:
      "Reports are flagged against a fixed set of debris types — plastics, fishing nets, e-waste, tires, and more — so similar reports are handled consistently.",
  },
  {
    icon: UserCheck,
    title: "Always human-verified",
    description:
      "AI output is a suggestion for administrators, never shown to citizens as a confirmed result. Only an administrator's verified assessment is authoritative.",
  },
];

export function AiBenefits() {
  return (
    <section className="bg-secondary/50 py-16">
      <div className="container">
        <h2 className="text-center text-2xl font-bold tracking-tight">AI-assisted, not AI-decided</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <benefit.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{benefit.title}</h3>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
