import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/phone";

export function HeroSection({
  businessName,
  tagline,
  trackingNumber,
}: {
  businessName: string | null;
  tagline: string | null;
  trackingNumber: string | null;
}) {
  return (
    <section className="relative overflow-hidden bg-brand-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-5">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Serving Saskatoon &amp; area
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
            {tagline || `${businessName ?? "Mr. Drain Plumbing"} — here when you need us`}
          </h1>
          <p className="max-w-lg text-lg text-foreground/70">
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
        <div className="relative mx-auto w-full max-w-sm">
          <Image
            src="/logo.png"
            alt={businessName ?? "Mr. Drain Plumbing"}
            width={1024}
            height={754}
            priority
            className="w-full drop-shadow-xl"
          />
        </div>
      </div>
    </section>
  );
}
