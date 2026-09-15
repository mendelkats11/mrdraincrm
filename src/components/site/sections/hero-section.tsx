import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, DollarSign, MapPin, Phone, Sparkles } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/phone";

// Same four claims WhyMrDrainSection makes further down the page (same
// copy, same icons) — repeated here as a quick-glance strip right under
// the fold rather than making visitors scroll to see them. Deliberately
// not "Licensed & Insured" or "24/7" — this site has no license/insurance
// record or around-the-clock staffing to back those up.
const TRUST_POINTS = [
  { icon: MapPin, title: "Local & Family-Owned", body: "Serving Saskatoon & area" },
  { icon: DollarSign, title: "Upfront, Honest Pricing", body: "No surprise fees" },
  { icon: Clock, title: "Fast Response", body: "We move quickly on urgent issues" },
  { icon: Sparkles, title: "Clean, Respectful Work", body: "We treat your home like our own" },
] as const;

/** Splits on the last sentence break ("? ", "! ", or ". ") so the final
 *  clause of the tagline renders in the accent color — a plain-navy
 *  fallback for single-sentence taglines rather than guessing where to
 *  split mid-sentence. Content-driven, not hardcoded to today's copy, so
 *  it keeps working as the tagline is edited. */
function splitTaglineForAccent(tagline: string): [string, string] {
  const match = /^(.*[?!.]\s+)(\S.*)$/.exec(tagline);
  return match ? [match[1].trimEnd(), match[2]] : [tagline, ""];
}

function Tile({
  src,
  className,
  priority,
}: {
  src: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-secondary ${className ?? ""}`}>
      <Image
        src={src}
        alt="Recent plumbing work by Mr. Drain Plumbing in Saskatoon"
        fill
        priority={priority}
        sizes="(min-width: 1024px) 30vw, 45vw"
        className="object-cover"
      />
    </div>
  );
}

export function HeroSection({
  businessName,
  tagline,
  trackingNumber,
  photoUrls,
}: {
  businessName: string | null;
  tagline: string | null;
  trackingNumber: string | null;
  /** 1-3 admin-picked photos (Website > Homepage > Hero); falls back to the
   *  plain logo when empty. */
  photoUrls?: string[];
}) {
  const photos = photoUrls?.slice(0, 3) ?? [];
  const [headlineLead, headlineAccent] = splitTaglineForAccent(
    tagline || `${businessName ?? "Mr. Drain Plumbing"} - here when you need us.`,
  );

  return (
    <>
      {/* Both columns live inside the same max-w-6xl container the rest of
          the site uses (header, footer, every section below) — an inset
          photo grid, even margins on every side regardless of window
          width. Plain background on purpose: no gradients, glows, or
          floating decoration — the photos and the copy carry the section. */}
      <section className="bg-background">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="flex flex-col gap-5 lg:gap-6">
            <span className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-foreground/50 uppercase lg:text-sm">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              Proudly serving Saskatoon &amp; area
            </span>
            <h1 className="text-4xl leading-[1.1] font-bold tracking-tight text-brand-navy sm:text-5xl lg:text-[3.4rem]">
              {headlineLead}
              {headlineAccent ? <span className="text-primary"> {headlineAccent}</span> : null}
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-foreground/60">
              Fast response, upfront pricing, and plumbers who actually explain what&apos;s wrong.
              Call now or request a free quote and we&apos;ll get back to you quickly.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {trackingNumber ? (
                <a
                  href={`tel:${trackingNumber}`}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-[1.02]"
                >
                  <Phone className="size-5" aria-hidden="true" />
                  Call {formatPhoneForDisplay(trackingNumber)}
                </a>
              ) : null}
              <Link
                href="/contact"
                className="flex items-center gap-2 rounded-full border-2 border-primary px-6 py-3.5 text-base font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                Get a Free Quote
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* A clean grid of real square-cornered tiles — one large photo
              carries the most visual weight, 1-2 more sit alongside it.
              Same overall footprint (aspect ratio) regardless of photo
              count, so the section's height never shifts. No overlays. */}
          <div className="relative aspect-[4/3] w-full lg:aspect-[5/4]">
            {photos.length === 0 ? (
              <div className="flex size-full items-center justify-center rounded-xl bg-secondary">
                <Image
                  src="/logo.png"
                  alt={businessName ?? "Mr. Drain Plumbing"}
                  width={1024}
                  height={754}
                  priority
                  className="w-full max-w-xs"
                />
              </div>
            ) : photos.length === 1 ? (
              <Tile priority src={photos[0]} className="size-full" />
            ) : photos.length === 2 ? (
              <div className="grid size-full grid-cols-2 gap-3">
                <Tile priority src={photos[0]} className="size-full" />
                <Tile src={photos[1]} className="size-full" />
              </div>
            ) : (
              <div className="grid size-full grid-cols-2 grid-rows-2 gap-3">
                <Tile priority src={photos[0]} className="row-span-2 size-full" />
                <Tile src={photos[1]} className="size-full" />
                <Tile src={photos[2]} className="size-full" />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="border-y border-border bg-secondary/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-4 py-10 sm:grid-cols-4 lg:px-6">
          {TRUST_POINTS.map((point) => (
            <div key={point.title} className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-white text-primary">
                <point.icon className="size-4.5" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-brand-navy sm:text-base">
                  {point.title}
                </span>
                <span className="text-xs text-foreground/55 sm:text-sm">{point.body}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
