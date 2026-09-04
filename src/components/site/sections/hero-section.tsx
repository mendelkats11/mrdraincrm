"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/phone";
import { useEditorMode } from "../editor-mode-context";
import { EditableText } from "../editable-text";

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
    <section className="relative overflow-hidden bg-brand-cream">
      <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col items-start gap-5">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Serving Saskatoon &amp; area
          </span>
          <EditableText
            as="h1"
            className="text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl"
            value={tagline || `${businessName ?? "Mr. Drain Plumbing"} — here when you need us`}
            onCommit={editor ? (v) => editor.patchSettingsField("tagline", v) : undefined}
          />
          <p className="max-w-lg text-lg leading-relaxed text-foreground/70">
            Fast response, upfront pricing, and plumbers who actually explain what&apos;s wrong.
            Call now or request a free quote and we&apos;ll get back to you quickly.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {trackingNumber ? (
              <a
                href={`tel:${trackingNumber}`}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-transform hover:scale-[1.02]"
              >
                <Phone className="size-5" aria-hidden="true" />
                Call {formatPhoneForDisplay(trackingNumber)}
              </a>
            ) : null}
            <Link
              href="/contact"
              className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md transition-transform hover:scale-[1.02]"
            >
              Get a Free Quote
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
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
            // a spec-sheet layout. A plain `w-full aspect-square` (not a
            // fixed max-width, and not taller-than-wide) — it fills the
            // grid column like the 1/2-photo cases already do, and every
            // tile's percentage position/size was chosen to stay within
            // that square, so nothing gets clipped or pushes the section
            // taller than the text column next to it.
            <div className="relative aspect-square w-full">
              <div className="absolute left-0 top-0 z-10 w-[78%] -rotate-3 overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                <div className="relative aspect-[4/3]">
                  <Image src={photos[0]} alt="" fill priority className="object-cover" />
                </div>
              </div>
              <div className="absolute right-0 top-[32%] z-20 w-[62%] rotate-3 overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                <div className="relative aspect-[4/3]">
                  <Image src={photos[1]} alt="" fill className="object-cover" />
                </div>
              </div>
              <div className="absolute bottom-[12%] left-[32%] z-30 w-[48%] -rotate-6 overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                <div className="relative aspect-square">
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
