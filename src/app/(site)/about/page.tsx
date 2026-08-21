import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | Mr. Drain Plumbing",
  description:
    "Learn about Mr. Drain Plumbing, a locally owned plumbing company serving Saskatoon and area.",
};

export default async function AboutPage() {
  const db = getDb();
  const settings = await getWebsiteSettings(db);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-6 text-center">
        <Image src="/logo.png" alt="" width={160} height={118} className="h-24 w-auto" />
        <h1 className="text-4xl font-bold text-brand-navy">
          {settings.aboutHeading || "About " + (settings.businessName ?? "Mr. Drain Plumbing")}
        </h1>
      </div>
      {settings.aboutBody ? (
        <p className="whitespace-pre-line text-lg leading-relaxed text-foreground/80">
          {settings.aboutBody}
        </p>
      ) : (
        <p className="text-center text-foreground/60">More information coming soon.</p>
      )}

      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </div>
  );
}
