import Link from "next/link";

const FAQ_ITEMS = [
  {
    question: "Do I need an account to report debris?",
    answer: "Yes — creating a free account lets us keep you updated on your report's status.",
  },
  {
    question: "Is my exact location shared publicly?",
    answer:
      "No. The public map and other citizens only ever see a generalised, locality-level position. Your exact coordinates are visible only to administrators reviewing the case.",
  },
  {
    question: "What happens after I submit a report?",
    answer:
      "Your photo goes through AI-assisted triage to flag likely debris types, then an administrator reviews it, assesses risk, and coordinates any cleanup action.",
  },
  {
    question: "Can I track a report without logging in?",
    answer: "Yes — use the complaint number you received when you reported it on the track page.",
  },
  {
    question: "How is my data used?",
    answer: "See our privacy notice for the full details on what we collect and how it's used.",
  },
];

/** Native <details>/<summary> — accessible, keyboard-native, no JS or extra
 * Radix dependency needed for something this simple (CLAUDE.md §2: no heavy motion). */
export function Faq() {
  return (
    <section className="bg-secondary/50 py-16">
      <div className="container max-w-2xl">
        <h2 className="text-center text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="mt-8 divide-y divide-border rounded-lg border border-border bg-card">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group p-4">
              <summary className="cursor-pointer list-none font-medium marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.answer.includes("privacy notice") ? (
                  <>
                    See our{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      privacy notice
                    </Link>{" "}
                    for the full details on what we collect and how it&apos;s used.
                  </>
                ) : (
                  item.answer
                )}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
