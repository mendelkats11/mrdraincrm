// @vitest-environment node
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../helpers/test-db";
import {
  createPortfolioJob,
  deletePortfolioJob,
  listPublishedPortfolioJobs,
  listPublishedPortfolioJobsForServiceArea,
  updatePortfolioJob,
} from "@/lib/website/portfolio-jobs";
import { portfolioJobs, serviceAreas } from "@/lib/db/schema";

describe("website portfolio jobs", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    await ctx.client.close();
  });

  it("creates a job with a slug derived from the title", async () => {
    const job = await createPortfolioJob(
      ctx.db,
      { title: "Bathroom Drain Repair", coverImageKey: "public-assets/media/a.jpg" },
      null,
    );
    expect(job.slug).toBe("bathroom-drain-repair");
    expect(job.hidden).toBe(false);
    expect(job.featured).toBe(false);
  });

  it("appends a numeric suffix when the slug is already taken", async () => {
    const first = await createPortfolioJob(
      ctx.db,
      { title: "Emergency Callout", coverImageKey: "public-assets/media/a.jpg" },
      null,
    );
    const second = await createPortfolioJob(
      ctx.db,
      { title: "Emergency Callout", coverImageKey: "public-assets/media/b.jpg" },
      null,
    );
    expect(first.slug).toBe("emergency-callout");
    expect(second.slug).toBe("emergency-callout-2");
  });

  it("listPublishedPortfolioJobs excludes hidden jobs", async () => {
    const shown = await createPortfolioJob(
      ctx.db,
      { title: "Shown job", coverImageKey: "public-assets/media/a.jpg" },
      null,
    );
    const hidden = await createPortfolioJob(
      ctx.db,
      { title: "Hidden job", coverImageKey: "public-assets/media/b.jpg" },
      null,
    );
    await updatePortfolioJob(ctx.db, hidden.id, { hidden: true }, null);

    const rows = await listPublishedPortfolioJobs(ctx.db);
    expect(rows.map((r) => r.id)).toEqual([shown.id]);
  });

  it("listPublishedPortfolioJobsForServiceArea only returns jobs tagged to that area", async () => {
    const [area] = await ctx.db
      .insert(serviceAreas)
      .values({ name: "Rosewood", slug: "rosewood" })
      .returning();

    const tagged = await createPortfolioJob(
      ctx.db,
      { title: "Rosewood job", coverImageKey: "public-assets/media/a.jpg", serviceAreaId: area.id },
      null,
    );
    await createPortfolioJob(
      ctx.db,
      { title: "Untagged job", coverImageKey: "public-assets/media/b.jpg" },
      null,
    );

    const rows = await listPublishedPortfolioJobsForServiceArea(ctx.db, area.id);
    expect(rows.map((r) => r.id)).toEqual([tagged.id]);
  });

  it("patching one field never touches the others (partial update)", async () => {
    const job = await createPortfolioJob(
      ctx.db,
      {
        title: "Original title",
        coverImageKey: "public-assets/media/a.jpg",
        description: "Original description",
      },
      null,
    );

    await updatePortfolioJob(ctx.db, job.id, { title: "New title" }, null);

    const [after] = await ctx.db.select().from(portfolioJobs).where(eq(portfolioJobs.id, job.id));
    expect(after.title).toBe("New title");
    expect(after.description).toBe("Original description");
    expect(after.coverImageKey).toBe("public-assets/media/a.jpg");
  });

  it("does not change a job's slug when its title is updated", async () => {
    const job = await createPortfolioJob(
      ctx.db,
      { title: "Original title", coverImageKey: "public-assets/media/a.jpg" },
      null,
    );
    const updated = await updatePortfolioJob(ctx.db, job.id, { title: "New title" }, null);
    expect(updated.slug).toBe(job.slug);
    expect(updated.title).toBe("New title");
  });

  it("deletePortfolioJob removes the row", async () => {
    const job = await createPortfolioJob(
      ctx.db,
      { title: "To delete", coverImageKey: "public-assets/media/a.jpg" },
      null,
    );
    await deletePortfolioJob(ctx.db, job.id, null);

    const rows = await ctx.db.select().from(portfolioJobs);
    expect(rows).toHaveLength(0);
  });
});
