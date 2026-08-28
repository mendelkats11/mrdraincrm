import type { Metadata } from "next";
import { Star } from "lucide-react";
import { getDb } from "@/lib/db/client";
import { listPublishedReviews } from "@/lib/website/reviews";
import { getWebsiteSettings } from "@/lib/website/settings";
import { cn } from "@/lib/utils";
import { MobileFloatingCta } from "@/components/site/mobile-floating-cta";
import { CtaSection } from "@/components/site/sections/cta-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews | Mr. Drain Plumbing",
  description: "See what customers are saying about Mr. Drain Plumbing.",
};

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= rating ? "fill-current" : "opacity-25")} />
      ))}
    </div>
  );
}

export default async function ReviewsPage() {
  const db = getDb();
  const [reviews, settings] = await Promise.all([listPublishedReviews(db), getWebsiteSettings(db)]);

  return (
    <>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-bold text-brand-navy">Customer Reviews</h1>
        </div>

        {reviews.length === 0 ? (
          <p className="text-center text-foreground/60">No reviews yet — check back soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {reviews.map((review) => (
              <figure
                key={review.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <Stars rating={review.rating} />
                {review.reviewText ? (
                  <blockquote className="text-sm text-foreground/80">
                    &ldquo;{review.reviewText}&rdquo;
                  </blockquote>
                ) : null}
                <figcaption className="mt-auto text-sm font-medium text-brand-navy">
                  {review.customerName}
                  <span className="ml-2 font-normal text-foreground/50">
                    {DATE_FMT.format(review.reviewDate)}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      <CtaSection trackingNumber={settings.defaultCallrailTrackingNumber} />
      <MobileFloatingCta trackingNumber={settings.defaultCallrailTrackingNumber} />
    </>
  );
}
