import Link from "next/link";

import { auth } from "@/auth";
import { AiBenefits } from "@/components/marketing/ai-benefits";
import { ContactSection } from "@/components/marketing/contact-section";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ImpactStats } from "@/components/marketing/impact-stats";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await auth();

  return (
    <>
      <SiteHeader
        nav={[
          { label: "How it works", href: "#how-it-works" },
          { label: "Track a complaint", href: "/track" },
          { label: "Map", href: "/map" },
          { label: "FAQ", href: "#faq" },
        ]}
        actions={
          session?.user ? (
            <>
              {session.user.role === "admin" ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">Admin</Link>
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href="/profile">Profile</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign up</Link>
              </Button>
            </>
          )
        }
      />
      <main>
        <Hero
          reportHref={session?.user ? "/dashboard" : "/register"}
          reportLabel={session?.user ? "Go to your dashboard" : "Report Debris — Sign Up Free"}
        />
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <AiBenefits />
        <ImpactStats />
        <div id="faq">
          <Faq />
        </div>
        <ContactSection />
      </main>
      <SiteFooter />
    </>
  );
}
