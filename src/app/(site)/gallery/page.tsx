import type { Metadata } from "next";
import Image from "next/image";
import { getDb } from "@/lib/db/client";
import { listPublishedGalleryItems } from "@/lib/website/gallery";
import { getWebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery | Mr. Drain Plumbing",
  description: "Real completed plumbing work from Mr. Drain Plumbing.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const db = getDb();
  const [items, settings] = await Promise.all([
    listPublishedGalleryItems(db),
    getWebsiteSettings(db),
  ]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-bold text-brand-navy">Our Work</h1>
          <p className="max-w-xl text-foreground/70">A look at real jobs we&apos;ve completed.</p>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-foreground/60">
            Photos of our work are coming soon — check back shortly.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-border"
              >
                <Image
                  src={publicAssetUrl(item.storageKey)}
                  alt={item.caption ?? ""}
                  fill
                  className="object-cover"
                />
                {item.caption ? (
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs text-white">
                    {item.caption}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
