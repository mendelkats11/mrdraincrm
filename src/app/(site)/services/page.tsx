import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listPublishedServices } from "@/lib/website/services";
import { getWebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plumbing Services | Mr. Drain Plumbing",
  description:
    "Full-service residential plumbing — drain cleaning, water heaters, repiping, and more, serving Saskatoon and area.",
};

export default async function ServicesPage() {
  const db = getDb();
  const [services, settings] = await Promise.all([
    listPublishedServices(db),
    getWebsiteSettings(db),
  ]);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-bold text-brand-navy">Our Services</h1>
          <p className="max-w-xl text-foreground/70">
            From routine repairs to full replacements, here&apos;s everything we handle.
          </p>
        </div>

        {services.length === 0 ? (
          <p className="text-center text-foreground/60">Services coming soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
                  {service.imageKey ? (
                    <Image
                      src={publicAssetUrl(service.imageKey)}
                      alt=""
                      width={48}
                      height={48}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Wrench className="size-6" aria-hidden="true" />
                  )}
                </div>
                <h2 className="font-semibold text-brand-navy group-hover:text-primary">
                  {service.name}
                </h2>
                {service.description ? (
                  <p className="line-clamp-2 text-sm text-foreground/70">{service.description}</p>
                ) : null}
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
