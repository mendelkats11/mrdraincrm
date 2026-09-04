import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Wrench } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getPortfolioJobBySlug } from "@/lib/website/portfolio-jobs";
import { getService } from "@/lib/website/services";
import { getServiceArea } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPortfolioJobBySlug(getDb(), slug);
  if (!job) return {};
  return {
    title: `${job.title} | Mr. Drain Plumbing`,
    description: job.description || `Real completed plumbing work: ${job.title}.`,
    alternates: { canonical: `/gallery/${job.slug}` },
    openGraph: { images: [publicAssetUrl(job.coverImageKey)] },
  };
}

// The website editor overhaul's Jobs feature (Sep 2026) — each completed
// job promoted from an unlinked gallery photo into its own indexable page,
// so real finished work can actually rank and be shared instead of sitting
// in an unlinked grid tile.
export default async function PortfolioJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const [job, settings] = await Promise.all([
    getPortfolioJobBySlug(db, slug),
    getWebsiteSettings(db),
  ]);
  if (!job) notFound();

  const [service, serviceArea] = await Promise.all([
    job.serviceId ? getService(db, job.serviceId) : null,
    job.serviceAreaId ? getServiceArea(db, job.serviceAreaId) : null,
  ]);

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Gallery", path: "/gallery" },
    { name: job.title, path: `/gallery/${job.slug}` },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="relative h-64 w-full sm:h-96">
        <Image
          src={publicAssetUrl(job.coverImageKey)}
          alt={job.title}
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/gallery" className="text-sm text-primary hover:underline">
          ← Back to gallery
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-brand-navy sm:text-4xl">{job.title}</h1>

        {service || serviceArea ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {service ? (
              <Link
                href={`/services/${service.slug}`}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground/80 hover:border-primary hover:text-primary"
              >
                <Wrench className="size-3.5" aria-hidden="true" />
                {service.name}
              </Link>
            ) : null}
            {serviceArea ? (
              <Link
                href={`/service-areas/${serviceArea.slug}`}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground/80 hover:border-primary hover:text-primary"
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                {serviceArea.name}
              </Link>
            ) : null}
          </div>
        ) : null}

        {job.description ? (
          <p className="mt-6 whitespace-pre-line text-lg text-foreground/80">{job.description}</p>
        ) : null}
      </div>

      <CtaSection
        heading="Need work like this done?"
        trackingNumber={settings.defaultCallrailTrackingNumber}
      />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </div>
  );
}
