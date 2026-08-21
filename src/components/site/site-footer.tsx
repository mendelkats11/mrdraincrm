import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

export function SiteFooter({
  businessName,
  businessAddress,
  contactEmail,
  trackingNumber,
  appUrl,
}: {
  businessName: string | null;
  businessAddress: string | null;
  contactEmail: string | null;
  trackingNumber: string | null;
  appUrl: string;
}) {
  return (
    <footer className="mt-auto bg-brand-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div className="flex flex-col gap-3">
          <Image
            src="/logo.png"
            alt={businessName ?? "Mr. Drain Plumbing"}
            width={140}
            height={103}
            className="h-14 w-auto"
          />
          <p className="text-sm text-white/70">
            {businessName ?? "Mr. Drain Plumbing"} — local, reliable plumbing.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <h2 className="mb-1 font-semibold text-white">Get in touch</h2>
          {trackingNumber ? (
            <a
              href={`tel:${trackingNumber}`}
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <Phone className="size-4" aria-hidden="true" />
              {trackingNumber}
            </a>
          ) : null}
          {contactEmail ? (
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <Mail className="size-4" aria-hidden="true" />
              {contactEmail}
            </a>
          ) : null}
          {businessAddress ? (
            <p className="flex items-start gap-2 text-white/80">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-pre-line">{businessAddress}</span>
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <h2 className="mb-1 font-semibold text-white">Explore</h2>
          <Link href="/services" className="text-white/80 hover:text-white">
            Services
          </Link>
          <Link href="/service-areas" className="text-white/80 hover:text-white">
            Service Areas
          </Link>
          <Link href="/gallery" className="text-white/80 hover:text-white">
            Gallery
          </Link>
          <Link href="/reviews" className="text-white/80 hover:text-white">
            Reviews
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-white/50">
          <p>
            &copy; {new Date().getFullYear()} {businessName ?? "Mr. Drain Plumbing"}. All rights
            reserved.
          </p>
          {/* Subtle, not part of primary navigation — docs/PROJECT_SPEC.md §2.3. */}
          <a href={appUrl} className="text-white/40 hover:text-white/70">
            Log In
          </a>
        </div>
      </div>
    </footer>
  );
}
