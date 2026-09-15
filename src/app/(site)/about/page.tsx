import type { Metadata } from "next";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone, PhoneCall, Search, Wrench, CheckCircle2 } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { listPublishedServices } from "@/lib/website/services";
import { listPublishedPortfolioJobs } from "@/lib/website/portfolio-jobs";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { formatPhoneForDisplay } from "@/lib/phone";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";
import { WhyMrDrainSection } from "@/components/site/sections/why-mr-drain-section";
import { breadcrumbSchema } from "@/lib/seo/breadcrumb-schema";
import { Breadcrumbs } from "@/components/site/breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | Mr. Drain Plumbing",
  description:
    "Learn about Mr. Drain Plumbing, a locally owned plumbing company serving Saskatoon and area.",
  alternates: { canonical: "/about" },
};

// Honest, non-decorative process steps — describes how a job with Mr. Drain
// actually goes (call/quote -> diagnose -> fix -> clean up), not generic
// stock-agency filler. No claims this business can't back up (no "licensed
// & insured" badge, no invented response-time SLA).
const PROCESS_STEPS = [
  {
    icon: PhoneCall,
    title: "You reach out",
    body: "Call or send a quote request - tell us what's going on.",
  },
  {
    icon: Search,
    title: "We diagnose & quote",
    body: "We look at the problem and give you a clear price before any work starts.",
  },
  {
    icon: Wrench,
    title: "We do the work",
    body: "No shortcuts, no upsells - just the job, done right the first time.",
  },
  {
    icon: CheckCircle2,
    title: "You're all set",
    body: "We clean up after ourselves and make sure you're satisfied before we leave.",
  },
] as const;

export default async function AboutPage() {
  const db = getDb();
  const [settings, serviceAreas, services, portfolioJobs] = await Promise.all([
    getWebsiteSettings(db),
    listPublishedServiceAreas(db),
    listPublishedServices(db),
    listPublishedPortfolioJobs(db),
  ]);

  const businessName = settings.businessName ?? "Mr. Drain Plumbing";
  const paragraphs = (settings.aboutBody ?? "").split(/\r?\n/).filter(Boolean);
  const [leadParagraph, ...restParagraphs] = paragraphs;
  const storyPhotos = portfolioJobs.slice(0, 3);
  const mapsHref = settings.businessAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.businessAddress)}`
    : null;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(crumbs)) }}
      />
      <Breadcrumbs crumbs={crumbs} />

      {/* Hero: heading + lead paragraph alongside a real photo grid (same
          Tile language as the homepage hero) instead of a single photo -
          more visual energy without adding any decoration that isn't a
          real photo of real work. */}
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-12 sm:pt-6 lg:pb-16">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-5">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              About Us
            </span>
            <h1 className="max-w-xl text-4xl leading-[1.1] font-bold tracking-tight text-brand-navy sm:text-5xl">
              {settings.aboutHeading || `About ${businessName}`}
            </h1>
            {leadParagraph ? (
              <p className="max-w-lg text-lg leading-relaxed text-foreground/70">{leadParagraph}</p>
            ) : null}
          </div>

          {storyPhotos.length > 0 ? (
            <div className="relative aspect-[5/4] w-full">
              {storyPhotos.length === 1 ? (
                <StoryTile src={publicAssetUrl(storyPhotos[0].coverImageKey)} className="size-full" />
              ) : storyPhotos.length === 2 ? (
                <div className="grid size-full grid-cols-2 gap-3">
                  <StoryTile src={publicAssetUrl(storyPhotos[0].coverImageKey)} className="size-full" />
                  <StoryTile src={publicAssetUrl(storyPhotos[1].coverImageKey)} className="size-full" />
                </div>
              ) : (
                <div className="grid size-full grid-cols-2 grid-rows-2 gap-3">
                  <StoryTile
                    src={publicAssetUrl(storyPhotos[0].coverImageKey)}
                    className="row-span-2 size-full"
                  />
                  <StoryTile src={publicAssetUrl(storyPhotos[1].coverImageKey)} className="size-full" />
                  <StoryTile src={publicAssetUrl(storyPhotos[2].coverImageKey)} className="size-full" />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Real, computed numbers only - service/area counts straight from
          the database, never invented stats like "years in business" or
          "jobs completed" that nothing here actually tracks. */}
      <div className="border-y border-border bg-secondary/50">
        <div className="mx-auto grid max-w-4xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
            <span className="text-3xl font-bold text-brand-navy">{services.length}</span>
            <span className="text-sm text-foreground/60">plumbing services offered</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
            <span className="text-3xl font-bold text-brand-navy">{serviceAreas.length}</span>
            <span className="text-sm text-foreground/60">Saskatoon-area communities served</span>
          </div>
          <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
            <span className="text-3xl font-bold text-brand-navy">100%</span>
            <span className="text-sm text-foreground/60">locally owned & operated</span>
          </div>
        </div>
      </div>

      {/* Rest of the story, if there's more than one paragraph. */}
      {restParagraphs.length > 0 ? (
        <section className="mx-auto max-w-2xl px-4 py-16 lg:py-20">
          <div className="flex flex-col gap-4 text-base leading-relaxed text-foreground/70">
            {restParagraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {/* How a job actually goes - real process, not stock-agency filler. */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-bold text-brand-navy">How It Works</h2>
          <p className="max-w-xl text-foreground/70">From the first call to a finished job.</p>
        </div>
        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((step, i) => (
            <div key={step.title} className="flex flex-col items-center gap-3 text-center">
              <div className="relative flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="size-6" aria-hidden="true" />
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-navy text-[11px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold text-brand-navy">{step.title}</h3>
              <p className="text-sm text-foreground/70">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <WhyMrDrainSection />

      {/* Contact card - the same facts as the footer/contact page, laid
          out as a clean scannable card rather than a wall of text, with a
          real link to directions instead of an embedded map (no maps API
          key configured). */}
      <section className="mx-auto max-w-4xl px-4 py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-8 rounded-xl border border-border bg-card p-8 sm:grid-cols-3 sm:p-10">
          {settings.businessAddress ? (
            <div className="flex flex-col items-start gap-2">
              <MapPin className="size-5 text-primary" aria-hidden="true" />
              <span className="font-semibold text-brand-navy">Visit or write us</span>
              <span className="text-sm whitespace-pre-line text-foreground/70">
                {settings.businessAddress}
              </span>
              {mapsHref ? (
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Get directions →
                </a>
              ) : null}
            </div>
          ) : null}
          {settings.defaultCallrailTrackingNumber ? (
            <div className="flex flex-col items-start gap-2">
              <Phone className="size-5 text-primary" aria-hidden="true" />
              <span className="font-semibold text-brand-navy">Call us</span>
              <a
                href={`tel:${settings.defaultCallrailTrackingNumber}`}
                className="text-sm text-foreground/70 hover:text-primary"
              >
                {formatPhoneForDisplay(settings.defaultCallrailTrackingNumber)}
              </a>
              <span className="flex items-center gap-1.5 text-xs text-foreground/50">
                <Clock className="size-3.5" aria-hidden="true" />
                Fast response on urgent calls
              </span>
            </div>
          ) : null}
          {settings.publicContactEmail ? (
            <div className="flex flex-col items-start gap-2">
              <Mail className="size-5 text-primary" aria-hidden="true" />
              <span className="font-semibold text-brand-navy">Email us</span>
              <a
                href={`mailto:${settings.publicContactEmail}`}
                className="text-sm break-all text-foreground/70 hover:text-primary"
              >
                {settings.publicContactEmail}
              </a>
              <span className="text-xs text-foreground/50">
                Serving {serviceAreas.length}+ Saskatoon-area communities
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}

function StoryTile({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-secondary ${className ?? ""}`}>
      <Image
        src={src}
        alt="Recent plumbing work by Mr. Drain Plumbing in Saskatoon"
        fill
        sizes="(min-width: 1024px) 40vw, 90vw"
        className="object-cover"
      />
    </div>
  );
}
