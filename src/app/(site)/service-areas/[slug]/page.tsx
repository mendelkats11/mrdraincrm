import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Wrench } from "lucide-react";
import {
  getServiceAreaBySlug,
  listPublishedServices,
  serviceAreas,
  siteSettings,
  listPublishedPortfolioJobsForServiceArea,
} from "@/lib/website/site-data";
import { formatPhoneForDisplay } from "@/lib/phone";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { GallerySection } from "@/components/site/sections/gallery-section";
import { CtaSection } from "@/components/site/sections/cta-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { faqSchema } from "@/lib/seo/faq-schema";
import { localBusinessSchema } from "@/lib/seo/local-business-schema";
import { areaSeoName } from "@/lib/website/area-seo-name";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { pageTitle } from "@/lib/seo/page-title";
import { getPublicSiteOrigin } from "@/lib/site-url";

export function generateStaticParams() {
  return serviceAreas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const area = await getServiceAreaBySlug(slug);
  if (!area) return {};
  return {
    title: pageTitle(`Plumber in ${areaSeoName(area)}`),
    description: area.copy,
    alternates: { canonical: `/service-areas/${area.slug}` },
    ...(area.images[0] ? { openGraph: { images: [publicAssetUrl(area.images[0])] } } : {}),
  };
}

export default async function ServiceAreaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [area, services] = await Promise.all([getServiceAreaBySlug(slug), listPublishedServices()]);
  if (!area) notFound();
  const settings = siteSettings;

  const areaJobs = await listPublishedPortfolioJobsForServiceArea(area.slug);

  // Falls back to the site default when this area has no CallRail number
  // of its own — docs/PROJECT_SPEC.md §2.4.
  const trackingNumber = area.callrailTrackingNumber || settings.defaultCallrailTrackingNumber;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Service Areas", path: "/service-areas" },
    { name: area.name, path: `/service-areas/${area.slug}` },
  ];
  const breadcrumbs = breadcrumbSchema(crumbs);
  const faqs = area.faqs;
  const areaName = areaSeoName(area);
  // This area's own LocalBusiness block, distinct from the sitewide one in
  // the root layout — this office has its own real address and its own
  // real Google Business Profile listing (Sep 2026), so it gets its own
  // entity matching that specific listing via sameAs, not just a mention
  // in the sitewide areaServed list.
  const areaSchema = localBusinessSchema({
    businessName: settings.businessName,
    businessAddress: area.businessAddress || settings.businessAddress,
    telephone: trackingNumber,
    areaServed: [areaName],
    url: `${getPublicSiteOrigin()}/service-areas/${area.slug}`,
    sameAs: area.googleMapsUrl ? [area.googleMapsUrl] : undefined,
  });

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(areaSchema) }}
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
            alt={`Mr. Drain Plumbing services in ${areaName}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-8 text-white">
              <MapPin className="size-6" aria-hidden="true" />
              <h1 className="text-3xl font-bold sm:text-4xl">Plumber in {areaName}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-brand-navy py-16">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 text-white">
            <MapPin className="size-6" aria-hidden="true" />
            <h1 className="text-3xl font-bold sm:text-4xl">Plumber in {areaName}</h1>
          </div>
        </div>
      )}

      <Breadcrumbs crumbs={crumbs} />

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
              Plumbing services we offer in {areaName}:
            </h2>
            <div className="flex flex-wrap gap-2">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/service-areas/${area.slug}/${service.slug}`}
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

      <GallerySection jobs={areaJobs} />

      <CtaSection heading={`Need a plumber in ${areaName}?`} trackingNumber={trackingNumber} />

      <MobileFloatingCta trackingNumber={trackingNumber} />
    </div>
  );
}
