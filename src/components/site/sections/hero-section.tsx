"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, DollarSign, MapPin, Phone } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/phone";
import { useEditorMode } from "../editor-mode-context";
import { EditableText } from "../editable-text";

// A fine dot grid, not a photographic/organic grain — deliberately subtle
// (6% black) and geometric rather than "noisy," so the cream background
// reads as a considered surface instead of one flat fill, without
// competing with the collage or the text for attention.
const HERO_TEXTURE = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='2' cy='2' r='1.3' fill='black' fill-opacity='0.06'/></svg>",
)}`;

export function HeroSection({
  businessName,
  tagline,
  trackingNumber,
  photoUrls,
}: {
  businessName: string | null;
  tagline: string | null;
  trackingNumber: string | null;
  /** 1-3 admin-picked photo URLs (Website > Homepage > Hero); falls back
   *  to the plain logo when empty/unset — the safe default until photos
   *  are actually chosen. */
  photoUrls?: string[];
}) {
  const editor = useEditorMode();
  const photos = photoUrls?.slice(0, 3) ?? [];
  return (
    <section
      // `isolate` gives this section its own stacking context, so the
      // collage's internal z-10/20/30 tiles can never compete with the
      // sticky header's z-index again regardless of what either side
      // changes to later — this is what let the collage paint over the
      // header while scrolled (both were plain descendants of the same
      // stacking context, and z-30 tied against the header's old z-30
      // resolved by DOM order, i.e. the hero — being later — won).
      className="isolate relative overflow-hidden bg-brand-cream"
      style={{
        // Layered, back to front: a soft warm glow behind the collage, a
        // soft light glow behind the text (gives the flat cream fill some
        // depth/direction instead of reading as one solid block), and the
        // dot texture tiled on top of both for the tactile surface.
        backgroundImage: [
          "radial-gradient(ellipse 60% 55% at 88% 85%, rgba(255,140,26,0.12), transparent 70%)",
          "radial-gradient(circle at 10% 10%, rgba(255,255,255,0.7), transparent 55%)",
          `url("${HERO_TEXTURE}")`,
        ].join(", "),
      }}
    >
      <div className="mx-auto grid max-w-7xl items-start gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12 lg:py-24">
        <div className="relative flex flex-col items-start gap-5 lg:gap-6">
          {/* The brand name as real text, sitting in the gap between the
              header and the "Proudly serving..." badge — the header's own
              logo graphic carries the name visually but only as pixels,
              invisible to search engines/screen readers and easy to miss.
              A small tracked-out kicker rather than a big wordmark, so it
              reads as a brand label, not a second headline. Absolutely
              positioned above this column (not a normal flex child) so it
              drops into that empty space without adding to the gap-5 flow
              and pushing the badge/headline/everything below it down. */}
          {businessName ? (
            <span className="absolute -top-9 left-0 flex items-center gap-2 text-base font-black tracking-widest text-brand-navy uppercase lg:-top-11 lg:text-lg">
              {/* A short accent bar before the name — a common "eyebrow
                  label" convention (small colored mark + tracked-out text
                  above a headline), not a stray artifact. */}
              <span className="h-1 w-7 rounded-full bg-accent" aria-hidden="true" />
              {businessName}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary lg:px-4 lg:py-1.5 lg:text-base">
            <MapPin className="size-3.5 lg:size-4" aria-hidden="true" />
            Proudly serving Saskatoon &amp; area
          </span>
          <EditableText
            as="h1"
            className="text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl"
            value={tagline || `${businessName ?? "Mr. Drain Plumbing"} — here when you need us`}
            onCommit={editor ? (v) => editor.patchSettingsField("tagline", v) : undefined}
          />
          <p className="max-w-lg text-lg leading-relaxed text-foreground/70 lg:max-w-xl lg:text-xl">
            Fast response, upfront pricing, and plumbers who actually explain what&apos;s wrong.
            Call now or request a free quote and we&apos;ll get back to you quickly.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {trackingNumber ? (
              <a
                href={`tel:${trackingNumber}`}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-transform hover:scale-[1.02] lg:px-8 lg:py-4 lg:text-lg"
              >
                <Phone className="size-5" aria-hidden="true" />
                Call {formatPhoneForDisplay(trackingNumber)}
              </a>
            ) : null}
            <Link
              href="/contact"
              className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md transition-transform hover:scale-[1.02] lg:px-8 lg:py-4 lg:text-lg"
            >
              Get a Free Quote
            </Link>
          </div>
          {/* A compact trust strip beneath the CTAs — the same three
              value props WhyMrDrainSection makes further down the page
              (same icons, too), surfaced here instead of leaving the space
              under the buttons empty. Deliberately not a star-rating or
              "licensed & insured" badge — this site has no review data or
              license/insurance record to back that up yet; these three are
              already asserted elsewhere on the site, not new claims. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-sm text-foreground/60 lg:gap-x-6 lg:text-base">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              Local &amp; family-owned
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="size-4 text-primary" aria-hidden="true" />
              Upfront, honest pricing
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-primary" aria-hidden="true" />
              Fast response
            </span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none lg:-translate-y-4 lg:translate-x-6">
          {photos.length === 0 ? (
            <Image
              src="/logo.png"
              alt={businessName ?? "Mr. Drain Plumbing"}
              width={1024}
              height={754}
              priority
              className="mx-auto w-full max-w-sm drop-shadow-xl"
            />
          ) : photos.length === 1 ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl">
              <Image src={photos[0]} alt="" fill priority className="object-cover" />
            </div>
          ) : photos.length === 2 ? (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((url, i) => (
                <div
                  key={url}
                  className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-xl"
                >
                  <Image src={url} alt="" fill priority={i === 0} className="object-cover" />
                </div>
              ))}
            </div>
          ) : (
            // A tilted, overlapping stack — big photo behind, medium
            // overlapping its bottom-right, small overlapping the medium —
            // rather than a plain even grid, so real finished-job photos
            // read as a deliberate "craftsman portfolio" moment instead of
            // a spec-sheet layout. One aspect ratio (4:3) across all three
            // tiles and gentler, tighter tilt angles (was -3/+3/-6, now
            // -2/+2/-4) — three different crops at three different tilt
            // magnitudes was what made the first pass read as cluttered/
            // arbitrary rather than a deliberate composition. A plain
            // `w-full aspect-square` outer box (not a fixed max-width) —
            // fills the grid column like the 1/2-photo cases already do,
            // and every tile's percentage position/size was chosen to stay
            // within that square, so nothing gets clipped or pushes the
            // section taller than the text column next to it.
            <div className="relative aspect-square w-full">
              <div className="absolute left-0 top-0 z-10 w-[78%] -rotate-2 overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                <div className="relative aspect-[4/3]">
                  <Image src={photos[0]} alt="" fill priority className="object-cover" />
                </div>
              </div>
              <div className="absolute right-0 top-[32%] z-20 w-[62%] rotate-2 overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                <div className="relative aspect-[4/3]">
                  <Image src={photos[1]} alt="" fill className="object-cover" />
                </div>
              </div>
              <div className="absolute bottom-[18%] left-[16%] z-30 w-[48%] -rotate-4 overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                <div className="relative aspect-[4/3]">
                  <Image src={photos[2]} alt="" fill className="object-cover" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
