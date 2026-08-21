import Image from "next/image";
import Link from "next/link";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import type { galleryItems as galleryItemsTable } from "@/lib/db/schema";

type GalleryItem = typeof galleryItemsTable.$inferSelect;

// Skips entirely when empty rather than showing placeholder "job" photos —
// docs/DESIGN_SYSTEM.md §3: "do not invent fake job imagery."
export function GallerySection({ items, limit }: { items: GalleryItem[]; limit?: number }) {
  if (items.length === 0) return null;
  const shown = limit ? items.slice(0, limit) : items;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <h2 className="text-3xl font-bold text-brand-navy">Recent Work</h2>
        <p className="max-w-xl text-foreground/70">A look at real jobs we&apos;ve completed.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square overflow-hidden rounded-xl border border-border"
          >
            <Image
              src={publicAssetUrl(item.storageKey)}
              alt={item.caption ?? ""}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {limit && items.length > limit ? (
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
