// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  createReview,
  deleteReview,
  listPublishedReviews,
  listReviewsForAdmin,
  updateReview,
} from "@/lib/website/reviews";
import { reviews } from "@/lib/db/schema";

describe("website reviews", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a review with the given rating", async () => {
    const review = await createReview(
      ctx.db,
      { customerName: "Jane Doe", reviewText: "Great work!", rating: 5 },
      null,
    );
    expect(review.rating).toBe(5);
    expect(review.featured).toBe(false);
  });

  it("rejects a rating outside 1-5 at the database level", async () => {
    await expect(
      createReview(ctx.db, { customerName: "Jane Doe", rating: 6 }, null),
    ).rejects.toThrow();
  });

  it("listPublishedReviews sorts featured first", async () => {
    const normal = await createReview(ctx.db, { customerName: "A", rating: 4 }, null);
    const featured = await createReview(
      ctx.db,
      { customerName: "B", rating: 5, featured: true },
      null,
    );

    const rows = await listPublishedReviews(ctx.db);
    expect(rows[0].id).toBe(featured.id);
    expect(rows[1].id).toBe(normal.id);
  });

  it("updateReview changes fields", async () => {
    const review = await createReview(ctx.db, { customerName: "Jane Doe", rating: 3 }, null);
    await updateReview(ctx.db, review.id, { rating: 5, featured: true }, null);

    const [updated] = await ctx.db.select().from(reviews);
    expect(updated.rating).toBe(5);
    expect(updated.featured).toBe(true);
  });

  it("deleteReview removes the row permanently", async () => {
    const review = await createReview(ctx.db, { customerName: "Jane Doe", rating: 5 }, null);
    await deleteReview(ctx.db, review.id, null);
    expect(await ctx.db.select().from(reviews)).toHaveLength(0);
  });

  it("listReviewsForAdmin returns everything (there's no hidden state)", async () => {
    await createReview(ctx.db, { customerName: "A", rating: 5 }, null);
    await createReview(ctx.db, { customerName: "B", rating: 1 }, null);
    expect(await listReviewsForAdmin(ctx.db)).toHaveLength(2);
  });
});
