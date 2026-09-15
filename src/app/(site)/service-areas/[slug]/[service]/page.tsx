import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Wrench } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getServiceAreaBySlug } from "@/lib/website/service-areas";
import { getServiceBySlug } from "@/lib/website/services";
import { getWebsiteSettings } from "@/lib/website/settings";
import { formatPhoneForDisplay } from "@/lib/phone";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { faqSchema } from "@/lib/seo/faq-schema";
import { areaSeoName } from "@/lib/website/area-seo-name";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { pageTitle } from "@/lib/seo/page-title";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; service: string }>;
}): Promise<Metadata> {
  const { slug, service: serviceSlug } = await params;
  const db = getDb();
  const [area, service] = await Promise.all([
    getServiceAreaBySlug(db, slug),
    getServiceBySlug(db, serviceSlug),
  ]);
  if (!area || !service) return {};
  const areaName = areaSeoName(area);
  return {
    title: pageTitle(`${service.name} in ${areaName}`),
    description:
      service.metaDescription ||
      `Professional ${service.name.toLowerCase()} in ${areaName} - ${
        service.description?.toLowerCase() ?? "fast, upfront service"
      } Call now for a free quote.`,
    keywords: [
      service.name,
      `${service.name} ${area.name}`,
      `plumber ${area.name}`,
      `${area.name} plumbing`,
      "Saskatoon plumber",
    ],
    // Self-referencing, not pointing back at /services/{slug} — this page
    // is meant to independently rank for "{service} {area}" searches, not
    // fold into the generic page as a near-duplicate.
    alternates: { canonical: `/service-areas/${area.slug}/${service.slug}` },
    ...(service.imageKey || area.images[0]
      ? { openGraph: { images: [publicAssetUrl(service.imageKey || area.images[0])] } }
      : {}),
  };
}

export default async function ServiceAreaServicePage({
  params,
}: {
  params: Promise<{ slug: string; service: string }>;
}) {
  const { slug, service: serviceSlug } = await params;
  const db = getDb();
  const [area, service, settings] = await Promise.all([
    getServiceAreaBySlug(db, slug),
    getServiceBySlug(db, serviceSlug),
    getWebsiteSettings(db),
  ]);
  if (!area || !service) notFound();

  const areaName = areaSeoName(area);
  // Falls back to the site default when this area has no CallRail number
  // of its own — same convention as the area overview page.
  const trackingNumber = area.callrailTrackingNumber || settings.defaultCallrailTrackingNumber;
  const heroImageKey = service.imageKey || area.images[0];

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Service Areas", path: "/service-areas" },
    { name: area.name, path: `/service-areas/${area.slug}` },
    { name: service.name, path: `/service-areas/${area.slug}/${service.slug}` },
  ];
  const breadcrumbs = breadcrumbSchema(crumbs);
  // Same blank-line-separated paragraphs as the generic service page — the
  // actual service content is shared verbatim (it's genuine, substantive
  // information about the service itself); what's localized here is the
  // heading, intro, and contact details around it.
  const paragraphs = (service.content ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const faqs = service.faqs;

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

      {heroImageKey ? (
        <div className="relative h-64 w-full sm:h-80">
          <Image
            src={publicAssetUrl(heroImageKey)}
            alt={`${service.name} in ${areaName}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-8 text-white">
              <MapPin className="size-6" aria-hidden="true" />
              <h1 className="text-3xl font-bold sm:text-4xl">
                {service.name} in {areaName}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-brand-navy py-16">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 text-white">
            <Wrench className="size-7" aria-hidden="true" />
            <h1 className="text-3xl font-bold sm:text-4xl">
              {service.name} in {areaName}
            </h1>
          </div>
        </div>
      )}

      <Breadcrumbs crumbs={crumbs} />

      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-lg text-foreground/80">
          Need {service.name.toLowerCase()} in {areaName}? Mr. Drain provides fast, upfront{" "}
          {service.name.toLowerCase()} throughout {area.name} and the surrounding Saskatoon area.
          {service.description ? ` ${service.description}` : ""}
        </p>

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

        {paragraphs.length > 0 ? (
          <div className="mt-10 flex flex-col gap-4 border-t border-border pt-8 text-foreground/80">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : null}

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

        <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-8 text-sm">
          <Link
            href={`/service-areas/${area.slug}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-foreground/80 hover:border-primary hover:text-primary"
          >
            <MapPin className="size-3.5" aria-hidden="true" />
            More about {areaName}
          </Link>
          <Link
            href={`/services/${service.slug}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-foreground/80 hover:border-primary hover:text-primary"
          >
            <Wrench className="size-3.5" aria-hidden="true" />
            More about {service.name}
          </Link>
        </div>
      </div>

      <CtaSection
        heading={`Need ${service.name.toLowerCase()} in ${areaName}?`}
        trackingNumber={trackingNumber}
      />

      <MobileFloatingCta trackingNumber={trackingNumber} />
    </div>
  );
}
