import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import type { serviceAreas as serviceAreasTable } from "@/lib/db/schema";

type ServiceArea = typeof serviceAreasTable.$inferSelect;

export function ServiceAreasSection({
  serviceAreas,
  limit,
}: {
  serviceAreas: ServiceArea[];
  limit?: number;
}) {
  if (serviceAreas.length === 0) return null;
  const shown = limit ? serviceAreas.slice(0, limit) : serviceAreas;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <h2 className="text-3xl font-bold text-brand-navy">Where We Work</h2>
        <p className="max-w-xl text-foreground/70">
          Proudly serving Saskatoon and these communities.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((area) => (
          <Link
            key={area.id}
            href={`/service-areas/${area.slug}`}
            className="group relative flex h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border shadow-sm transition-shadow hover:shadow-md"
          >
            {area.images[0] ? (
              <Image
                src={publicAssetUrl(area.images[0])}
                alt=""
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-brand-navy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="relative flex items-center gap-2 p-4 text-white">
              <MapPin className="size-4" aria-hidden="true" />
              <span className="font-semibold">{area.name}</span>
            </div>
          </Link>
        ))}
      </div>
      {limit && serviceAreas.length > limit ? (
        <div className="mt-8 flex justify-center">
          <Link
            href="/service-areas"
            className="rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            View all service areas
          </Link>
        </div>
      ) : null}
    </section>
  );
}
