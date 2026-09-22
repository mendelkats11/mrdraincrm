import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  getPortfolioJobBySlug,
  getServiceAreaBySlug,
  portfolioJobs,
  siteSettings,
} from "@/lib/website/site-data";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { pageTitle } from "@/lib/seo/page-title";

export function generateStaticParams() {
  return portfolioJobs.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPortfolioJobBySlug(slug);
  if (!job) return {};
  return {
    title: pageTitle(job.title),
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
  const job = await getPortfolioJobBySlug(slug);
  if (!job) notFound();
  const settings = siteSettings;

  const serviceArea = job.serviceAreaSlug ? await getServiceAreaBySlug(job.serviceAreaSlug) : null;

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Gallery", path: "/gallery" },
    { name: job.title, path: `/gallery/${job.slug}` },
  ];
  const breadcrumbs = breadcrumbSchema(crumbs);

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
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <Breadcrumbs crumbs={crumbs} />

      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold text-brand-navy sm:text-4xl">{job.title}</h1>

        {serviceArea ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/service-areas/${serviceArea.slug}`}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground/80 hover:border-primary hover:text-primary"
            >
              <MapPin className="size-3.5" aria-hidden="true" />
              {serviceArea.name}
            </Link>
          </div>
        ) : null}

        <p className="mt-6 whitespace-pre-line text-lg text-foreground/80">{job.description}</p>
      </div>

      <CtaSection
        heading="Need work like this done?"
        trackingNumber={settings.defaultCallrailTrackingNumber}
      />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </div>
  );
}
