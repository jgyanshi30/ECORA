import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = { title: "Privacy notice — Ecora" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="container max-w-3xl py-12">
        <h1 className="text-2xl font-bold tracking-tight">Privacy notice</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated 2026-08-29.</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold">What we collect</h2>
            <p>
              When you report debris, we collect the photo you submit, the location you confirm (either
              from your device or a pin you place on the map), and any description you add. When you
              create an account, we collect your name, email address, and optionally a phone number.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Location data and consent</h2>
            <p>
              Submitting a complaint requires your explicit consent to location collection, captured and
              stored alongside the report. Your exact coordinates are never shown on the public map or to
              other citizens — only a generalised, locality-level position is ever public. Exact
              coordinates are visible only to administrators reviewing the case.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">AI-assisted analysis</h2>
            <p>
              Submitted photos are analysed by an automated detection model to help administrators triage
              reports faster. This analysis is assistive, not authoritative — it is never presented to you
              or anyone else as a confirmed fact, and only an administrator&apos;s verified review is
              treated as final.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Who can see your data</h2>
            <p>
              Your account details and the exact details of complaints you file are visible to you and to
              Ecora administrators. Administrators&apos; internal notes and risk-assessment
              detail are never exposed to citizens. Every administrator action on your data is recorded in
              an audit log.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Account deletion</h2>
            <p>
              You can request deletion of your account at any time from your profile page. This flags your
              account for our support team to process — your account remains active until then. Contact us
              if you want to check on the status of a deletion request.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold">Contact</h2>
            <p>
              Questions about this notice or your data can be sent to{" "}
              <a href="mailto:privacy@ecora.example" className="text-primary hover:underline">
                privacy@ecora.example
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
