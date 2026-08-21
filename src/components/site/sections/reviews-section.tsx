import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { reviews as reviewsTable } from "@/lib/db/schema";

type Review = typeof reviewsTable.$inferSelect;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= rating ? "fill-current" : "opacity-25")} />
      ))}
    </div>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

// Skips entirely when empty — these are always real, manually-entered
// testimonials (docs/PROJECT_SPEC.md §19.3); no fabricated placeholder
// reviews.
export function ReviewsSection({ reviews, limit }: { reviews: Review[]; limit?: number }) {
  if (reviews.length === 0) return null;
  const shown = limit ? reviews.slice(0, limit) : reviews;

  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-bold text-brand-navy">What Customers Say</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((review) => (
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
      </div>
    </section>
  );
}
