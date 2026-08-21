import { desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { reviews } from "@/lib/db/schema";
import { recordActivity } from "@/lib/audit/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, any, any>;

export async function listReviewsForAdmin<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db.select().from(reviews).orderBy(desc(reviews.reviewDate));
}

/** Every review is shown publicly once entered — there is no separate
 *  hide/publish flag on this table (only `featured`, for homepage
 *  selection); a review the owner doesn't want shown is deleted, not
 *  hidden, since these are always real, manually-entered testimonials
 *  (docs/PROJECT_SPEC.md §19.3 — no automatic Google review verification). */
export async function listPublishedReviews<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
) {
  return db.select().from(reviews).orderBy(desc(reviews.featured), desc(reviews.reviewDate));
}

export interface CreateReviewInput {
  customerName: string;
  reviewText?: string | null;
  rating: number;
  reviewDate?: Date;
  featured?: boolean;
}

export async function createReview<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  input: CreateReviewInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [review] = await tx
      .insert(reviews)
      .values({
        customerName: input.customerName,
        reviewText: input.reviewText || null,
        rating: input.rating,
        reviewDate: input.reviewDate ?? new Date(),
        featured: input.featured ?? false,
      })
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "review",
      entityId: review.id,
      action: "review_created",
      newValue: { customerName: review.customerName, rating: review.rating },
    });

    return review;
  });
}

export interface UpdateReviewInput {
  customerName?: string;
  reviewText?: string | null;
  rating?: number;
  reviewDate?: Date;
  featured?: boolean;
}

export async function updateReview<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  reviewId: string,
  input: UpdateReviewInput,
  actorUserId: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(reviews).where(eq(reviews.id, reviewId));
    if (!before) throw new Error(`Review ${reviewId} not found`);

    const [after] = await tx
      .update(reviews)
      .set({
        customerName: input.customerName,
        reviewText: input.reviewText !== undefined ? input.reviewText || null : undefined,
        rating: input.rating,
        reviewDate: input.reviewDate,
        featured: input.featured,
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    await recordActivity(tx, {
      actorUserId,
      entityType: "review",
      entityId: reviewId,
      action: "review_updated",
      oldValue: { customerName: before.customerName, rating: before.rating },
      newValue: { customerName: after.customerName, rating: after.rating },
    });

    return after;
  });
}

export async function deleteReview<TQueryResult extends PgQueryResultHKT>(
  db: Db<TQueryResult>,
  reviewId: string,
  actorUserId: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [removed] = await tx.delete(reviews).where(eq(reviews.id, reviewId)).returning();
    if (!removed) return;

    await recordActivity(tx, {
      actorUserId,
      entityType: "review",
      entityId: reviewId,
      action: "review_deleted",
      oldValue: { customerName: removed.customerName },
    });
  });
}
