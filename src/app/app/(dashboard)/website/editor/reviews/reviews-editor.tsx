"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { EditableText } from "@/components/site/editable-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createReviewAction,
  deleteReviewAction,
  patchReviewFieldAction,
  setReviewFeaturedAction,
  setReviewRatingAction,
} from "@/lib/website/review-actions";
import type { reviews } from "@/lib/db/schema";

type Review = typeof reviews.$inferSelect;

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

/**
 * The Reviews page in the visual editor — customer name and quote are
 * click-to-edit, the star rating is click-to-set, "Feature" pins a review
 * to the homepage's Reviews section. No hide/archive here: reviews have
 * always been delete-only (docs/PROJECT_SPEC.md §19.3 — always real,
 * manually-entered testimonials, never soft-hidden).
 */
export function ReviewsEditor({ reviews: initialReviews }: { reviews: Review[] }) {
  const [reviewList, setReviewList] = useState(initialReviews);
  const [prevInitialReviews, setPrevInitialReviews] = useState(initialReviews);
  if (initialReviews !== prevInitialReviews) {
    setPrevInitialReviews(initialReviews);
    setReviewList(initialReviews);
  }
  const [adding, setAdding] = useState(false);

  function patchLocal(id: string, patch: Partial<Review>) {
    setReviewList((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleDelete(id: string) {
    setReviewList((prev) => prev.filter((r) => r.id !== id));
    void deleteReviewAction(id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reviews</h1>
          <p className="text-sm text-muted-foreground">
            Click a name, quote, or star rating to edit it directly. Featured reviews are the ones
            that can appear on the homepage.
          </p>
        </div>
        {!adding ? (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add review
          </Button>
        ) : null}
      </div>

      {adding ? <NewReviewForm onCancel={() => setAdding(false)} /> : null}

      {reviewList.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No reviews yet — add your first one above.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviewList.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onPatch={(patch) => patchLocal(review.id, patch)}
              onDelete={() => handleDelete(review.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewReviewForm({ onCancel }: { onCancel: () => void }) {
  const [customerName, setCustomerName] = useState("");
  const [rating, setRating] = useState(5);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit() {
    if (!customerName.trim()) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("customerName", customerName.trim());
      formData.set("rating", String(rating));
      const result = await createReviewAction(undefined, formData);
      if (result?.ok) {
        router.refresh();
        onCancel();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center">
      <Input
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        placeholder="Customer name"
        className="flex-1"
      />
      <StarPicker rating={rating} onChange={setRating} />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!customerName.trim() || pending}
          onClick={handleSubmit}
        >
          {pending ? "Creating…" : "Create"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function StarPicker({ rating, onChange }: { rating: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star className={cn("size-4", n <= rating ? "fill-current" : "opacity-25")} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  onPatch,
  onDelete,
}: {
  review: Review;
  onPatch: (patch: Partial<Review>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <StarPicker
          rating={review.rating}
          onChange={(rating) => {
            onPatch({ rating });
            void setReviewRatingAction(review.id, rating);
          }}
        />
        <div className="flex items-center gap-1 opacity-70 transition group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={review.featured ? "Unfeature" : "Feature"}
            title={review.featured ? "Unfeature" : "Feature on homepage"}
            onClick={() => {
              onPatch({ featured: !review.featured });
              void setReviewFeaturedAction(review.id, !review.featured);
            }}
          >
            <Star className={cn("size-4", review.featured && "fill-current text-primary")} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            aria-label="Delete review"
            title="Delete review"
            onClick={() => {
              if (window.confirm(`Delete ${review.customerName}'s review? This can't be undone.`))
                onDelete();
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <EditableText
        as="blockquote"
        multiline
        className="text-sm text-foreground/80"
        value={review.reviewText ?? ""}
        placeholder="Add the review quote"
        onCommit={(v) => {
          onPatch({ reviewText: v });
          void patchReviewFieldAction(review.id, { reviewText: v });
        }}
      />
      <div className="mt-auto flex items-center gap-2 text-sm">
        <EditableText
          as="span"
          className="font-medium text-brand-navy"
          value={review.customerName}
          onCommit={(v) => {
            onPatch({ customerName: v });
            void patchReviewFieldAction(review.id, { customerName: v });
          }}
        />
        <span className="font-normal text-foreground/50">{DATE_FMT.format(review.reviewDate)}</span>
      </div>
    </div>
  );
}
