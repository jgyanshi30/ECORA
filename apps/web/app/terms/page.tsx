import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = { title: "Terms of use — Ecora" };

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="container max-w-3xl py-12">
        <h1 className="text-2xl font-bold tracking-tight">Terms of use</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated 2026-08-29.</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold">What Ecora is</h2>
            <p>
              Ecora lets citizens report underwater and environmental debris, using
              AI-assisted image analysis to help administrators triage and act on reports. It is a
              reporting and coordination tool, not an emergency service — for immediate hazards, contact
              local authorities directly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Your reports</h2>
            <p>
              Submit only genuine reports of debris you have directly observed. Do not submit images or
              locations you do not have the right to share, or reports intended to harass, mislead, or
              target a specific person or property.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">AI-assisted detection is not a verdict</h2>
            <p>
              Automated detection results are a triage aid for administrators, not a confirmed
              determination of what is in a photo. Only an administrator&apos;s verified assessment is
              treated as authoritative, and reports are reviewed accordingly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Account responsibilities</h2>
            <p>
              Keep your password confidential and your contact details current. You are responsible for
              activity under your account. Administrator accounts are provisioned directly by Ecora
              and are not available through self-service registration.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Changes</h2>
            <p>
              We may update these terms as the platform evolves. Continued use after an update means you
              accept the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Contact</h2>
            <p>
              Questions about these terms can be sent to{" "}
              <a href="mailto:support@ecora.example" className="text-primary hover:underline">
                support@ecora.example
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
