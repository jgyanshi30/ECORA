import { Mail } from "lucide-react";

export function ContactSection() {
  return (
    <section className="container flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
        <Mail className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Questions or need help?</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Reach out and a member of the Ecora team will get back to you.
      </p>
      <a href="mailto:support@ecora.example" className="font-medium text-primary hover:underline">
        support@ecora.example
      </a>
    </section>
  );
}
