import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { appSettings, sequences, serviceAreas, services } from "./schema";

// Reference/dev data only — no accounts, no customer data. Auth (Phase 2)
// owns creating the actual owner user. Safe to run multiple times: every
// insert targets a unique constraint and no-ops on conflict.

const SEQUENCE_DEFAULTS = [
  { name: "job", prefix: "JOB-", nextNumber: 1, minDigits: 4 },
  { name: "invoice", prefix: "INV-", nextNumber: 1, minDigits: 4 },
  { name: "quote", prefix: "QUO-", nextNumber: 1, minDigits: 4 },
] as const;

// docs/PROJECT_SPEC.md §4 — initial service areas. Editable from the
// dashboard once Phase 15 (Website CMS) ships; these are just starting
// rows, not hard-coded content.
const SERVICE_AREA_NAMES = [
  "Brighton",
  "Rosewood",
  "College Park",
  "Stonebridge",
  "Martensville",
  "Warman",
] as const;

// docs/PROJECT_SPEC.md §5 — the 8 explicitly named core services. The
// remaining 12 of the 20-service catalog are deferred to you per the
// approved decision in docs/IMPLEMENTATION_PLAN.md §16 — not seeded here.
const CORE_SERVICE_NAMES = [
  "Drain Snaking",
  "Hydro Jetting",
  "Toilet Replacement",
  "Hot Water Tank Replacement",
  "Boiler Replacement",
  "Sump Pump",
  "Bathroom Renovations",
  "Repiping",
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
}

export async function seedDatabase<TQueryResult extends PgQueryResultHKT>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PgDatabase<TQueryResult, any, any>,
): Promise<SeedSummary> {
  await db
    .insert(appSettings)
    .values({ businessName: "Mr. Drain Plumbing" })
    .onConflictDoNothing({ target: appSettings.singleton });

  for (const s of SEQUENCE_DEFAULTS) {
    await db.insert(sequences).values(s).onConflictDoNothing({ target: sequences.name });
  }

  for (const [index, name] of SERVICE_AREA_NAMES.entries()) {
    await db
      .insert(serviceAreas)
      .values({ name, slug: slugify(name), sortOrder: index })
      .onConflictDoNothing({ target: serviceAreas.slug });
  }

  for (const [index, name] of CORE_SERVICE_NAMES.entries()) {
    await db
      .insert(services)
      .values({ name, slug: slugify(name), sortOrder: index })
      .onConflictDoNothing({ target: services.slug });
  }

  return {
    appSettings: 1,
    sequences: SEQUENCE_DEFAULTS.length,
    serviceAreas: SERVICE_AREA_NAMES.length,
    services: CORE_SERVICE_NAMES.length,
  };
}

// CLI entry point — only runs when this file is executed directly
// (`npm run db:seed`), not when seedDatabase is imported for tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { getDb } = await import("./client");
  seedDatabase(getDb())
    .then((summary) => {
      console.log(
        `Seeded: ${summary.appSettings} app_settings row, ${summary.sequences} sequences, ` +
          `${summary.serviceAreas} service areas, ${summary.services} services.`,
      );
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
