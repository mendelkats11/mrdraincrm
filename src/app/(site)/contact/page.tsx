import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ClipboardCheck, Mail, MapPin, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listActiveServiceAreas } from "@/lib/crm/leads";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { getWebsiteSettings } from "@/lib/website/settings";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { formatPhoneForDisplay } from "@/lib/phone";
import { ContactForm } from "./contact-form";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { Breadcrumbs } from "@/components/site/breadcrumbs";

// What happens after someone submits the form - sets expectations honestly
// (no invented SLA like "within 15 minutes") while still reassuring a
// visitor that a real person follows up, not a black hole.
const NEXT_STEPS = [
  { icon: MessageCircle, text: "We review your request" },
  { icon: PhoneCall, text: "We call or email you back" },
  { icon: ClipboardCheck, text: "You get an upfront quote" },
] as const;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get a Free Quote | Mr. Drain Plumbing",
  description: "Request a free plumbing quote from Mr. Drain Plumbing - Saskatoon and area.",
  alternates: { canonical: "/contact" },
};

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

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
  const mapsHref = settings.businessAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.businessAddress)}`
    : null;

  return (
    <div className="relative">
      {backgroundUrl ? (
        <>
          <Image src={backgroundUrl} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-brand-cream/90" />
        </>
      ) : (
        <div className="absolute inset-0 bg-brand-cream" />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(CRUMBS)) }}
      />
      <div className="relative">
        <Breadcrumbs crumbs={CRUMBS} />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-brand-navy">Get a Free Quote</h1>
            <p className="mt-1 text-foreground/70">
              Tell us about your plumbing issue and we&apos;ll get back to you shortly.
            </p>
          </div>
          {/* This form is for non-urgent requests - an active leak or no
              water shouldn't wait on an inbox check, so the phone number
              gets its own clearly urgent callout rather than being just
              another line in the sidebar card. */}
          {settings.defaultCallrailTrackingNumber ? (
            <a
              href={`tel:${settings.defaultCallrailTrackingNumber}`}
              className="flex shrink-0 items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-5 py-3 transition-colors hover:bg-primary/10"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs font-semibold tracking-wide text-primary uppercase">
                  Emergency? Call now
                </span>
                <span className="font-semibold text-brand-navy">
                  {formatPhoneForDisplay(settings.defaultCallrailTrackingNumber)}
                </span>
              </span>
            </a>
          ) : null}
        </div>

        {/* The heading lives above this grid (not as a taller first column)
            specifically so the form card and the sidebar card start at the
            same y — with items-start alone, a heading stacked above the
            form inside the left column would still leave the form itself
            sitting lower than the sidebar. */}
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <ContactForm serviceAreas={formServiceAreas} />
            </div>

            {/* Sets honest expectations for what happens after submitting -
                no invented response-time promise, just the real sequence. */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              {NEXT_STEPS.map((step, i) => (
                <div key={step.text} className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-primary shadow-sm">
                    {i + 1}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-foreground/70">
                    <step.icon className="size-4 text-primary" aria-hidden="true" />
                    {step.text}
                  </span>
                </div>
              ))}
            </div>
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
                <div className="flex items-start gap-2 text-foreground/80">
                  <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <span className="whitespace-pre-line">{settings.businessAddress}</span>
                    {mapsHref ? (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        Get directions →
                      </a>
                    ) : null}
                  </div>
                </div>
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
