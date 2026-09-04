import Image from "next/image";
import Link from "next/link";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import type { portfolioJobs } from "@/lib/db/schema";

type PortfolioJob = typeof portfolioJobs.$inferSelect;

// Skips entirely when empty rather than showing placeholder "job" photos —
// docs/DESIGN_SYSTEM.md §3: "do not invent fake job imagery."
//
// Each tile links to its own /gallery/[slug] page (website editor overhaul,
// phase 4) — these used to be plain unlinked photos with no page of their
// own to be indexed or shared.
export function GallerySection({ jobs, limit }: { jobs: PortfolioJob[]; limit?: number }) {
  if (jobs.length === 0) return null;
  const shown = limit ? jobs.slice(0, limit) : jobs;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <h2 className="text-3xl font-bold text-brand-navy">Recent Work</h2>
        <p className="max-w-xl text-foreground/70">A look at real jobs we&apos;ve completed.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((job) => (
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
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {job.title}
            </div>
          </Link>
        ))}
      </div>
      {limit && jobs.length > limit ? (
        <div className="mt-8 flex justify-center">
          <Link
            href="/gallery"
            className="rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            View full gallery
          </Link>
        </div>
      ) : null}
    </section>
  );
}
