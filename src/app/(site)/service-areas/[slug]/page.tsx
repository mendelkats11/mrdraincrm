import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, Phone } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getServiceAreaBySlug } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { formatPhoneForDisplay } from "@/lib/phone";
import { listPublishedGalleryItemsForServiceArea } from "@/lib/website/gallery";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { GallerySection } from "@/components/site/sections/gallery-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = await getServiceAreaBySlug(getDb(), slug);
  if (!area) return {};
  return {
    title: area.seoTitle || `Plumber in ${area.name} | Mr. Drain Plumbing`,
    description: area.metaDescription || area.copy || undefined,
    alternates: { canonical: `/service-areas/${area.slug}` },
  };
}

export default async function ServiceAreaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const [area, settings] = await Promise.all([
    getServiceAreaBySlug(db, slug),
    getWebsiteSettings(db),
  ]);
  if (!area) notFound();

  const areaGalleryItems = await listPublishedGalleryItemsForServiceArea(db, area.id);

  // Falls back to the site default when this area has no CallRail number
  // of its own — docs/PROJECT_SPEC.md §2.4.
  const trackingNumber = area.callrailTrackingNumber || settings.defaultCallrailTrackingNumber;

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Service Areas", path: "/service-areas" },
    { name: area.name, path: `/service-areas/${area.slug}` },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {area.images[0] ? (
        <div className="relative h-64 w-full sm:h-80">
          <Image
            src={publicAssetUrl(area.images[0])}
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-8 text-white">
              <MapPin className="size-6" aria-hidden="true" />
              <h1 className="text-3xl font-bold sm:text-4xl">Plumber in {area.name}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-brand-navy py-16">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 text-white">
            <MapPin className="size-6" aria-hidden="true" />
            <h1 className="text-3xl font-bold sm:text-4xl">Plumber in {area.name}</h1>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-12">
        {area.copy ? <p className="text-lg text-foreground/80">{area.copy}</p> : null}

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
          {trackingNumber ? (
            <a
              href={`tel:${trackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md"
            >
              <Phone className="size-5" aria-hidden="true" />
              Call {formatPhoneForDisplay(trackingNumber)}
            </a>
          ) : null}
          <a
            href="/contact"
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md"
          >
            Get a Free Quote
          </a>
        </div>
      </div>

      <GallerySection items={areaGalleryItems} />

      <MobileFloatingCta trackingNumber={trackingNumber} />
    </div>
  );
}
