import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Phone, Wrench } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getServiceBySlug } from "@/lib/website/services";
import { getWebsiteSettings } from "@/lib/website/settings";
import { formatPhoneForDisplay } from "@/lib/phone";
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
    <div>
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

        <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-8">
          {settings.defaultCallrailTrackingNumber ? (
            <a
              href={`tel:${settings.defaultCallrailTrackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md"
            >
              <Phone className="size-5" aria-hidden="true" />
              Call {formatPhoneForDisplay(settings.defaultCallrailTrackingNumber)}
            </a>
          ) : null}
          <a
            href="/contact"
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md"
          >
            Get a Free Quote
          </a>
        </div>
      </div>

      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </div>
  );
}
