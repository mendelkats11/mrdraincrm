import Link from "next/link";
import { Phone } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/phone";

export function CtaSection({
  heading,
  body,
  trackingNumber,
}: {
  /** Optional overrides from the homepage section's stored config; both
   *  fall back to the defaults below. Omitted on service/service-area
   *  detail pages, which render this section with the defaults. */
  heading?: string;
  body?: string;
  trackingNumber: string | null;
}) {
  return (
    <section className="bg-brand-navy">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-20 text-center text-white lg:py-24">
        <h2 className="text-3xl font-bold">{heading || "Got a plumbing problem?"}</h2>
        <p className="max-w-xl text-white/70">
          {body ||
            "Call now for fast help, or request a free quote and we'll get back to you quickly."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {trackingNumber ? (
            <a
              href={`tel:${trackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md transition-transform hover:scale-[1.02]"
            >
              <Phone className="size-5" aria-hidden="true" />
              Call {formatPhoneForDisplay(trackingNumber)}
            </a>
          ) : null}
          <Link
            href="/contact"
            className="flex items-center gap-2 rounded-full border-2 border-white/70 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            Get a Free Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
