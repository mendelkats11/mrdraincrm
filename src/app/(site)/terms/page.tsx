import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms of Service | Mr. Drain Plumbing",
  description: "Terms of Service for Mr. Drain Plumbing.",
  alternates: { canonical: "/terms" },
};

const PLACEHOLDER = `This is placeholder Terms of Service content. It has not been reviewed by a lawyer and should not be relied on as legal text — replace it with real terms before this page is used in production.`;

export default async function TermsPage() {
  const db = getDb();
  const settings = await getWebsiteSettings(db);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-6 text-4xl font-bold text-brand-navy">Terms of Service</h1>
        <p className="whitespace-pre-line text-foreground/80">
          {settings.termsOfServiceContent || PLACEHOLDER}
        </p>
      </div>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
