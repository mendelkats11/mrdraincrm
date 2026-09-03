import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Wrench } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getServiceAreaBySlug } from "@/lib/website/service-areas";
import { listPublishedServices } from "@/lib/website/services";
import { getWebsiteSettings } from "@/lib/website/settings";
import { formatPhoneForDisplay } from "@/lib/phone";
import { listPublishedGalleryItemsForServiceArea } from "@/lib/website/gallery";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { GallerySection } from "@/components/site/sections/gallery-section";
import { CtaSection } from "@/components/site/sections/cta-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { faqSchema } from "@/lib/seo/faq-schema";

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
  const [area, settings, services] = await Promise.all([
    getServiceAreaBySlug(db, slug),
    getWebsiteSettings(db),
    listPublishedServices(db),
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
  const faqs = area.faqs;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }}
        />
      ) : null}
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

        <div className="mt-6 flex flex-wrap gap-3">
          {trackingNumber ? (
            <a
              href={`tel:${trackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md"
            >
              <Phone className="size-5" aria-hidden="true" />
              Call {formatPhoneForDisplay(trackingNumber)}
            </a>
          ) : null}
          <Link
            href="/contact"
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md"
          >
            Get a Free Quote
          </Link>
        </div>

        {faqs.length > 0 ? (
          <div className="mt-10 border-t border-border pt-8">
            <h2 className="mb-4 text-2xl font-bold text-brand-navy">Frequently asked questions</h2>
            <dl className="flex flex-col gap-5">
              {faqs.map((faq, i) => (
                <div key={i}>
                  <dt className="font-semibold text-foreground">{faq.question}</dt>
                  <dd className="mt-1 text-foreground/80">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {services.length > 0 ? (
          <div className="mt-10 border-t border-border pt-8">
            <h2 className="mb-3 text-lg font-semibold text-brand-navy">
              Plumbing services in {area.name}
            </h2>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground/80 hover:border-primary hover:text-primary"
                >
                  <Wrench className="size-3.5" aria-hidden="true" />
                  {service.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <GallerySection items={areaGalleryItems} />

      <CtaSection heading={`Need a plumber in ${area.name}?`} trackingNumber={trackingNumber} />

      <MobileFloatingCta trackingNumber={trackingNumber} />
    </div>
  );
}
