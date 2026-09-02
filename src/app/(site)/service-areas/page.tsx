import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Areas | Mr. Drain Plumbing",
  description: "Mr. Drain Plumbing proudly serves Saskatoon and the surrounding communities.",
  alternates: { canonical: "/service-areas" },
};

export default async function ServiceAreasPage() {
  const db = getDb();
  const [areas, settings] = await Promise.all([
    listPublishedServiceAreas(db),
    getWebsiteSettings(db),
  ]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-bold text-brand-navy">Where We Work</h1>
          <p className="max-w-xl text-foreground/70">
            Proudly serving Saskatoon and these surrounding communities.
          </p>
        </div>

        {areas.length === 0 ? (
          <p className="text-center text-foreground/60">Service area list coming soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <Link
                key={area.id}
                href={`/service-areas/${area.slug}`}
                className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border shadow-sm transition-shadow hover:shadow-md"
              >
                {area.images[0] ? (
                  <Image
                    src={publicAssetUrl(area.images[0])}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-brand-navy" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="relative flex items-center gap-2 p-4 text-white">
                  <MapPin className="size-4" aria-hidden="true" />
                  <span className="font-semibold">{area.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
