import type { Metadata } from "next";
import { siteSettings } from "@/lib/website/site-data";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { Breadcrumbs } from "@/components/site/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy | Mr. Drain Plumbing",
  description: "Privacy Policy for Mr. Drain Plumbing.",
  alternates: { canonical: "/privacy" },
};

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy" },
];

export default function PrivacyPage() {
  const settings = siteSettings;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(CRUMBS)) }}
      />
      <Breadcrumbs crumbs={CRUMBS} />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-6 text-4xl font-bold text-brand-navy">Privacy Policy</h1>
        <p className="whitespace-pre-line text-foreground/80">{settings.privacyPolicyContent}</p>
      </div>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
