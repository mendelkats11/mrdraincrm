"use client";

import Link from "next/link";
import { Phone, MessageSquareText } from "lucide-react";

/**
 * docs/PROJECT_SPEC.md §2.4 — two clean floating buttons on mobile only
 * (hidden ≥sm, where the header's own Call Now/Get a Free Quote buttons
 * are already visible and don't need duplicating). `trackingNumber` is
 * resolved per-page by the caller (the site default from appSettings, or
 * a service area's own CallRail number on that area's page) so this
 * component itself has no data dependency.
 */
export function MobileFloatingCta({ trackingNumber }: { trackingNumber: string | null }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-black/5 bg-white/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
      {trackingNumber ? (
        <a
          href={`tel:${trackingNumber}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
        >
          <Phone className="size-4" aria-hidden="true" />
          Call Now
        </a>
      ) : null}
      <Link
        href="/contact"
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-sm"
      >
        <MessageSquareText className="size-4" aria-hidden="true" />
        Free Quote
      </Link>
    </div>
  );
}
