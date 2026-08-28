import Image from "next/image";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import type { services as servicesTable } from "@/lib/db/schema";

type Service = typeof servicesTable.$inferSelect;

export function ServicesSection({ services, limit }: { services: Service[]; limit?: number }) {
  if (services.length === 0) return null;
  const shown = limit ? services.slice(0, limit) : services;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mb-10 flex flex-col items-center gap-2 text-center">
        <h2 className="text-3xl font-bold text-brand-navy">Our Services</h2>
        <p className="max-w-xl text-foreground/70">
          From routine repairs to full replacements, here&apos;s what we handle.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((service) => (
          <Link
            key={service.id}
            href={`/services/${service.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-40 w-full overflow-hidden bg-primary/10">
              {service.imageKey ? (
                <Image
                  src={publicAssetUrl(service.imageKey)}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-primary">
                  <Wrench className="size-8" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 p-5">
              <h3 className="font-semibold text-brand-navy group-hover:text-primary">
                {service.name}
              </h3>
              {service.description ? (
                <p className="line-clamp-2 text-sm text-foreground/70">{service.description}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      {limit && services.length > limit ? (
        <div className="mt-8 flex justify-center">
          <Link
            href="/services"
            className="rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            View all services
          </Link>
        </div>
      ) : null}
    </section>
  );
}
