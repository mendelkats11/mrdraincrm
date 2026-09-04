import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listActiveServiceAreas } from "@/lib/crm/leads";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { formatPhoneForDisplay } from "@/lib/phone";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get a Free Quote | Mr. Drain Plumbing",
  description: "Request a free plumbing quote from Mr. Drain Plumbing — Saskatoon and area.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const db = getDb();
  const [formServiceAreas, sidebarServiceAreas, settings] = await Promise.all([
    listActiveServiceAreas(db),
    listPublishedServiceAreas(db),
    getWebsiteSettings(db),
  ]);

  const backgroundUrl = settings.contactBackgroundImageKey
    ? publicAssetUrl(settings.contactBackgroundImageKey)
    : null;

  return (
    <div className="relative">
      {backgroundUrl ? (
        <>
          <Image src={backgroundUrl} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-brand-cream/90" />
        </>
      ) : (
        <div className="absolute inset-0 bg-brand-cream" />
      )}

      <div className="relative mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-brand-navy">Get a Free Quote</h1>
          <p className="mt-1 text-foreground/70">
            Tell us about your plumbing issue and we&apos;ll get back to you shortly.
          </p>
        </div>

        {/* The heading lives above this grid (not as a taller first column)
            specifically so the form card and the sidebar card start at the
            same y — with items-start alone, a heading stacked above the
            form inside the left column would still leave the form itself
            sitting lower than the sidebar. */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <ContactForm serviceAreas={formServiceAreas} />
          </div>

          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
            <Image
              src="/logo.png"
              alt={settings.businessName ?? "Mr. Drain Plumbing"}
              width={140}
              height={103}
              className="h-14 w-auto self-start"
            />

            <div className="flex flex-col gap-2 text-sm">
              {settings.defaultCallrailTrackingNumber ? (
                <a
                  href={`tel:${settings.defaultCallrailTrackingNumber}`}
                  className="flex items-center gap-2 text-foreground/80 hover:text-primary"
                >
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  {formatPhoneForDisplay(settings.defaultCallrailTrackingNumber)}
                </a>
              ) : null}
              {settings.publicContactEmail ? (
                <a
                  href={`mailto:${settings.publicContactEmail}`}
                  className="flex items-center gap-2 text-foreground/80 hover:text-primary"
                >
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  {settings.publicContactEmail}
                </a>
              ) : null}
              {settings.businessAddress ? (
                <p className="flex items-start gap-2 text-foreground/80">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-pre-line">{settings.businessAddress}</span>
                </p>
              ) : null}
            </div>

            {sidebarServiceAreas.length > 0 ? (
              <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
                <h2 className="flex items-center gap-1.5 font-semibold text-brand-navy">
                  <MapPin className="size-4" aria-hidden="true" />
                  Service Areas
                </h2>
                <div className="flex flex-col gap-1.5">
                  {sidebarServiceAreas.map((area) => (
                    <Link
                      key={area.id}
                      href={`/service-areas/${area.slug}`}
                      className="text-foreground/80 hover:text-primary"
                    >
                      {area.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
