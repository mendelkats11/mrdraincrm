import type { Metadata } from "next";
import { siteSettings } from "@/lib/website/site-data";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { Breadcrumbs } from "@/components/site/breadcrumbs";

export const metadata: Metadata = {
  title: "Terms of Service | Mr. Drain Plumbing",
  description: "Terms of Service for Mr. Drain Plumbing.",
  alternates: { canonical: "/terms" },
};

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Terms of Service", path: "/terms" },
];

export default function TermsPage() {
  const settings = siteSettings;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(CRUMBS)) }}
      />
      <Breadcrumbs crumbs={CRUMBS} />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-6 text-4xl font-bold text-brand-navy">Terms of Service</h1>
        <p className="whitespace-pre-line text-foreground/80">{settings.termsOfServiceContent}</p>
      </div>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
