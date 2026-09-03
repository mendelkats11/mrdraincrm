import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, Wrench } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getServiceBySlug } from "@/lib/website/services";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { formatPhoneForDisplay } from "@/lib/phone";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
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
  const service = await getServiceBySlug(getDb(), slug);
  if (!service) return {};
  return {
    title: service.seoTitle || `${service.name} | Mr. Drain Plumbing`,
    description: service.metaDescription || service.description || undefined,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const [service, settings, serviceAreas] = await Promise.all([
    getServiceBySlug(db, slug),
    getWebsiteSettings(db),
    listPublishedServiceAreas(db),
  ]);
  if (!service) notFound();

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: service.name, path: `/services/${service.slug}` },
  ]);
  // Blank-line-separated paragraphs, admin-entered — see the "Page content"
  // field in the service edit dialog.
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
      {service.imageKey ? (
        <div className="relative h-64 w-full sm:h-80">
          <Image
            src={publicAssetUrl(service.imageKey)}
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-8 text-white">
              <h1 className="text-3xl font-bold sm:text-4xl">{service.name}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-brand-navy py-16">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 text-white">
            <Wrench className="size-7" aria-hidden="true" />
            <h1 className="text-3xl font-bold sm:text-4xl">{service.name}</h1>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-12">
        {service.description ? (
          <p className="text-lg text-foreground/80">{service.description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {settings.defaultCallrailTrackingNumber ? (
            <a
              href={`tel:${settings.defaultCallrailTrackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md"
            >
              <Phone className="size-5" aria-hidden="true" />
              Call {formatPhoneForDisplay(settings.defaultCallrailTrackingNumber)}
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

        {serviceAreas.length > 0 ? (
          <div className="mt-10 border-t border-border pt-8">
            <h2 className="mb-3 text-lg font-semibold text-brand-navy">
              {service.name} — serving Saskatoon and area
            </h2>
            <div className="flex flex-wrap gap-2">
              {serviceAreas.map((area) => (
                <Link
                  key={area.id}
                  href={`/service-areas/${area.slug}`}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground/80 hover:border-primary hover:text-primary"
                >
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {area.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <CtaSection
        heading={`Need ${service.name.toLowerCase()}?`}
        trackingNumber={settings.defaultCallrailTrackingNumber}
      />

      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </div>
  );
}
