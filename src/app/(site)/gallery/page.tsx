import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listPublishedPortfolioJobs } from "@/lib/website/portfolio-jobs";
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
  const [jobs, settings] = await Promise.all([
    listPublishedPortfolioJobs(db),
    getWebsiteSettings(db),
  ]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-bold text-brand-navy">Our Work</h1>
          <p className="max-w-xl text-foreground/70">A look at real jobs we&apos;ve completed.</p>
        </div>

        {jobs.length === 0 ? (
          <p className="text-center text-foreground/60">
            Photos of our work are coming soon — check back shortly.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/gallery/${job.slug}`}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border"
              >
                <Image
                  src={publicAssetUrl(job.coverImageKey)}
                  alt={job.title}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-xs font-medium text-white">
                  {job.title}
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
