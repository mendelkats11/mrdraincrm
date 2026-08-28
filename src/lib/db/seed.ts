import { pathToFileURL } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { appSettings, homepageSections, sequences, serviceAreas, services } from "./schema";

// Reference/dev data only — no accounts, no customer data. Auth (Phase 2)
// owns creating the actual owner user. Safe to run multiple times: every
// insert targets a unique constraint and no-ops on conflict.

const SEQUENCE_DEFAULTS = [
  { name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 },
  { name: "invoice", prefix: "INV-", nextNumber: 1, minDigits: 4 },
  { name: "quote", prefix: "QUO-", nextNumber: 1, minDigits: 4 },
] as const;

// docs/PROJECT_SPEC.md §4 — initial service areas, all real Saskatoon-area
// neighborhoods/communities. Deliberately non-templated placeholder copy
// per area (§4: "must not be simple duplicated city-name templates") —
// real copy/imagery is entered via the Website CMS once available.
const SERVICE_AREAS_SEED = [
  {
    name: "Brighton",
    copy: "Brighton is one of Saskatoon's newest growing neighbourhoods, and new-build plumbing brings its own issues — fixture defects, improperly sealed connections, and settling pipes are all things we catch early for Brighton homeowners.",
  },
  {
    name: "Rosewood",
    copy: "From older mainline concerns to modern fixture upgrades, we know Rosewood's mix of housing stock well and show up ready for whatever the job actually needs.",
  },
  {
    name: "College Park",
    copy: "College Park's established homes mean established pipes — we specialize in diagnosing slow drains and aging water lines before they turn into a real emergency.",
  },
  {
    name: "Stonebridge",
    copy: "Stonebridge is full of young families and growing homes, and we treat every visit like it's ours — clean work, clear pricing, and a plumber who actually explains what's wrong.",
  },
  {
    name: "Martensville",
    copy: "Just north of Saskatoon, Martensville homeowners get the same fast response and straightforward pricing as anywhere else in our service area — no extra trip charge for being outside the city limits.",
  },
  {
    name: "Warman",
    copy: "Warman's rapid growth means a lot of newer construction — we're familiar with the builders and fixtures common in the area, so diagnosis is fast and accurate.",
  },
] as const;

// docs/PROJECT_SPEC.md §5 — the 8 explicitly named core services, plus 12
// additional common plumbing services rounding out the 20-item catalog the
// spec calls for. All real, plausible offerings for a residential/light-
// commercial plumbing company — placeholders in the sense that exact
// wording/pricing/imagery is expected to be edited via the Website CMS,
// not in the sense of being made-up service categories.
const SERVICES_SEED = [
  {
    name: "Drain Snaking",
    description: "Fast, effective clearing for clogged or slow-draining lines using a drain snake.",
  },
  {
    name: "Hydro Jetting",
    description:
      "High-pressure water jetting to clear stubborn blockages and built-up buildup that snaking alone can't fully clear.",
  },
  {
    name: "Toilet Replacement",
    description:
      "Full toilet replacement and installation, including modern water-efficient models.",
  },
  {
    name: "Hot Water Tank Replacement",
    description: "Replacement and installation of tank and tankless hot water systems.",
  },
  {
    name: "Boiler Replacement",
    description: "Boiler replacement and installation for homes with hydronic heating systems.",
  },
  {
    name: "Sump Pump",
    description: "Sump pump installation, replacement, and repair to keep basements dry.",
  },
  {
    name: "Bathroom Renovations",
    description: "Full plumbing scope for bathroom renovations, from rough-in to fixture install.",
  },
  {
    name: "Repiping",
    description: "Whole-home or partial repiping for aging, corroded, or undersized water lines.",
  },
  {
    name: "Drain Cleaning",
    description: "Routine and emergency drain cleaning for kitchens, bathrooms, and main lines.",
  },
  {
    name: "Faucet Repair & Installation",
    description: "Repair or replacement of leaking, dripping, or outdated faucets.",
  },
  {
    name: "Garbage Disposal Installation",
    description: "Installation and replacement of kitchen garbage disposal units.",
  },
  {
    name: "Water Softener Installation",
    description: "Installation of water softener systems for homes with hard water.",
  },
  {
    name: "Gas Line Installation",
    description: "Gas line installation and repair for stoves, fireplaces, and outdoor appliances.",
  },
  {
    name: "Leak Detection",
    description: "Non-invasive leak detection to find hidden leaks before they cause real damage.",
  },
  {
    name: "Sewer Line Repair",
    description: "Diagnosis and repair of damaged or blocked sewer lines.",
  },
  {
    name: "Backflow Prevention",
    description: "Installation and testing of backflow prevention devices.",
  },
  {
    name: "Water Filtration Systems",
    description: "Whole-home and under-sink water filtration system installation.",
  },
  {
    name: "Kitchen Plumbing",
    description:
      "Sink, dishwasher, and under-cabinet plumbing for kitchen renovations and repairs.",
  },
  {
    name: "Fixture Installation",
    description: "Installation of sinks, showers, tubs, and other plumbing fixtures.",
  },
  {
    name: "Emergency Plumbing Repair",
    description: "Fast response for burst pipes, major leaks, and other urgent plumbing failures.",
  },
] as const;

// docs/PROJECT_SPEC.md §19.1 — the 7 structured homepage section types, in
// a sensible default order. `config` is deliberately minimal here (each
// section resolves its actual content live from services/serviceAreas/
// reviews/appSettings at render time) — see src/app/(site)/page.tsx.
const HOMEPAGE_SECTIONS_SEED = [
  { sectionType: "hero", sortOrder: 0, config: {} },
  { sectionType: "services", sortOrder: 1, config: {} },
  { sectionType: "why_mr_drain", sortOrder: 2, config: {} },
  { sectionType: "service_areas", sortOrder: 3, config: {} },
  { sectionType: "gallery", sortOrder: 4, config: {} },
  // Off by default — see appSettings.reviewsPageEnabled for the standalone
  // /reviews page's matching default. Reviews content was still a
  // placeholder when this default was set; toggle back on in Website >
  // Homepage once real reviews are in.
  { sectionType: "reviews", sortOrder: 5, config: {}, active: false },
  { sectionType: "cta", sortOrder: 6, config: {} },
] as const;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface SeedSummary {
  appSettings: number;
  sequences: number;
  serviceAreas: number;
  services: number;
  homepageSections: number;
}

export async function seedDatabase<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
): Promise<SeedSummary> {
  await db
    .insert(appSettings)
    .values({
      businessName: "Mr. Drain Plumbing",
      tagline: "Saskatoon's trusted plumbing experts",
      aboutHeading: "About Mr. Drain Plumbing",
      aboutBody:
        "Mr. Drain Plumbing is a locally owned and operated plumbing company serving Saskatoon and the surrounding area. We show up on time, explain what's actually wrong, and do the job right the first time — no upsells, no surprises.",
      publicContactEmail: "info@mrdrainsk.com",
    })
    .onConflictDoNothing({ target: appSettings.singleton });

  for (const s of SEQUENCE_DEFAULTS) {
    await db.insert(sequences).values(s).onConflictDoNothing({ target: sequences.name });
  }

  for (const [index, area] of SERVICE_AREAS_SEED.entries()) {
    await db
      .insert(serviceAreas)
      .values({ name: area.name, slug: slugify(area.name), copy: area.copy, sortOrder: index })
      .onConflictDoNothing({ target: serviceAreas.slug });
  }

  for (const [index, service] of SERVICES_SEED.entries()) {
    await db
      .insert(services)
      .values({
        name: service.name,
        slug: slugify(service.name),
        description: service.description,
        sortOrder: index,
      })
      .onConflictDoNothing({ target: services.slug });
  }

  const existingSections = await db.select({ id: homepageSections.id }).from(homepageSections);
  if (existingSections.length === 0) {
    for (const section of HOMEPAGE_SECTIONS_SEED) {
      await db.insert(homepageSections).values(section);
    }
  }

  return {
    appSettings: 1,
    sequences: SEQUENCE_DEFAULTS.length,
    serviceAreas: SERVICE_AREAS_SEED.length,
    services: SERVICES_SEED.length,
    homepageSections: existingSections.length === 0 ? HOMEPAGE_SECTIONS_SEED.length : 0,
  };
}

// CLI entry point — only runs when this file is executed directly
// (`npm run db:seed`), not when seedDatabase is imported for tests.
// Compares via pathToFileURL rather than a plain `file://${argv[1]}`
// string, which silently mismatches on Windows (backslashes, drive-letter
// URL encoding) and would make this whole block a no-op.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // No .env.local present — fall through to getDb()'s own
    // missing-DATABASE_URL error, which is a clearer message.
  }
  const { getDb } = await import("./client");
  seedDatabase(getDb())
    .then((summary) => {
      console.log(
        `Seeded: ${summary.appSettings} app_settings row, ${summary.sequences} sequences, ` +
          `${summary.serviceAreas} service areas, ${summary.services} services, ` +
          `${summary.homepageSections} homepage sections.`,
      );
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
