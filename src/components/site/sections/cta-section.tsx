import Link from "next/link";
import { Phone } from "lucide-react";

export function CtaSection({
  heading,
  body,
  trackingNumber,
}: {
  heading?: string;
  body?: string;
  trackingNumber: string | null;
}) {
  return (
    <section className="bg-brand-navy">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">{heading || "Got a plumbing problem?"}</h2>
        <p className="max-w-xl text-white/70">
          {body ||
            "Call now for fast help, or request a free quote and we'll get back to you quickly."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {trackingNumber ? (
            <a
              href={`tel:${trackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md"
            >
              <Phone className="size-5" aria-hidden="true" />
              Call Now
            </a>
          ) : null}
          <Link
            href="/contact"
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md"
          >
            Get a Free Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
