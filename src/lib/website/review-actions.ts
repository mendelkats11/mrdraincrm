"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { createReview, deleteReview, updateReview } from "./reviews";

const reviewFieldsSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required").max(200),
  reviewText: z.string().trim().max(3000).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  reviewDate: z.string().trim().optional(),
  featured: z.string().optional(),
});

export type ReviewFormState = { ok: true } | { ok: false; error: string } | undefined;

export async function createReviewAction(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await requireUser();
  const parsed = reviewFieldsSchema.safeParse({
    customerName: formData.get("customerName"),
    reviewText: formData.get("reviewText") || undefined,
    rating: formData.get("rating"),
    reviewDate: formData.get("reviewDate") || undefined,
    featured: formData.get("featured") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await createReview(
    db,
    {
      customerName: parsed.data.customerName,
      reviewText: parsed.data.reviewText || null,
      rating: parsed.data.rating,
      reviewDate: parsed.data.reviewDate ? new Date(parsed.data.reviewDate) : undefined,
      featured: parsed.data.featured === "on",
    },
    session.user.id,
  );

  revalidatePath("/website/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}

const updateReviewSchema = reviewFieldsSchema.extend({ reviewId: z.string().uuid() });

export async function updateReviewAction(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await requireUser();
  const parsed = updateReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    customerName: formData.get("customerName"),
    reviewText: formData.get("reviewText") || undefined,
    rating: formData.get("rating"),
    reviewDate: formData.get("reviewDate") || undefined,
    featured: formData.get("featured") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const db = getDb();
  await updateReview(
    db,
    parsed.data.reviewId,
    {
      customerName: parsed.data.customerName,
      reviewText: parsed.data.reviewText || null,
      rating: parsed.data.rating,
      reviewDate: parsed.data.reviewDate ? new Date(parsed.data.reviewDate) : undefined,
      featured: parsed.data.featured === "on",
    },
    session.user.id,
  );

  revalidatePath("/website/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}

const patchFieldSchema = z
  .object({
    customerName: z.string().trim().min(1).max(200).optional(),
    reviewText: z.string().trim().max(3000).optional(),
  })
  .strict();

/** The visual editor's click-on-the-text save path for a review's customer
 *  name/quote — same shape and guardrail reasoning as
 *  service-actions.ts's patchServiceFieldAction. */
export async function patchReviewFieldAction(
  reviewId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const parsed = patchFieldSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (Object.keys(parsed.data).length === 0) {
    return { ok: false, error: "Nothing to save." };
  }

  const db = getDb();
  await updateReview(db, reviewId, parsed.data, session.user.id);
  revalidatePath("/website/reviews");
  revalidatePath("/website/editor/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}

export async function setReviewFeaturedAction(reviewId: string, featured: boolean): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await updateReview(db, reviewId, { featured }, session.user.id);
  revalidatePath("/website/reviews");
  revalidatePath("/website/editor/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
}

export async function setReviewRatingAction(
  reviewId: string,
  rating: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const parsed = z.number().int().min(1).max(5).safeParse(rating);
  if (!parsed.success) return { ok: false, error: "Rating must be 1-5." };

  const db = getDb();
  await updateReview(db, reviewId, { rating: parsed.data }, session.user.id);
  revalidatePath("/website/reviews");
  revalidatePath("/website/editor/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteReviewAction(reviewId: string): Promise<void> {
  const session = await requireUser();
  const db = getDb();
  await deleteReview(db, reviewId, session.user.id);
  revalidatePath("/website/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
}
