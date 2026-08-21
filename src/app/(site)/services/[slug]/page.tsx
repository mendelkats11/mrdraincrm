import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Phone, Wrench } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getServiceBySlug } from "@/lib/website/services";
import { getWebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";

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
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const [service, settings] = await Promise.all([
    getServiceBySlug(db, slug),
    getWebsiteSettings(db),
  ]);
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
          {service.imageKey ? (
            <Image
              src={publicAssetUrl(service.imageKey)}
              alt=""
              width={64}
              height={64}
              className="size-full object-cover"
            />
          ) : (
            <Wrench className="size-8" aria-hidden="true" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">{service.name}</h1>
        </div>
      </div>

      {service.description ? (
        <p className="text-lg text-foreground/80">{service.description}</p>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
        {settings.defaultCallrailTrackingNumber ? (
          <a
            href={`tel:${settings.defaultCallrailTrackingNumber}`}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md"
          >
            <Phone className="size-5" aria-hidden="true" />
            Call Now
          </a>
        ) : null}
        <a
          href="/contact"
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md"
        >
          Get a Free Quote
        </a>
      </div>

      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </div>
  );
}
