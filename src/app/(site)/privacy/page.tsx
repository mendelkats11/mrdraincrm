import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy | Mr. Drain Plumbing",
  description: "Privacy Policy for Mr. Drain Plumbing.",
};

const PLACEHOLDER = `This is placeholder Privacy Policy content. It has not been reviewed by a lawyer and should not be relied on as legal text — replace it with a real privacy policy before this page is used in production.`;

export default async function PrivacyPage() {
  const db = getDb();
  const settings = await getWebsiteSettings(db);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-6 text-4xl font-bold text-brand-navy">Privacy Policy</h1>
        <p className="whitespace-pre-line text-foreground/80">
          {settings.privacyPolicyContent || PLACEHOLDER}
        </p>
      </div>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
