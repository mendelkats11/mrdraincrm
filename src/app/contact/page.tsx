import { getDb } from "@/lib/db/client";
import { listActiveServiceAreas } from "@/lib/crm/leads";
import { ContactForm } from "./contact-form";

// A minimal, neutral-styled placeholder — the full public site (home,
// services, service areas, gallery, reviews, about) is docs/ROADMAP.md
// Phase 15 and depends on brand assets that haven't been supplied yet
// (docs/IMPLEMENTATION_PLAN.md §2.4). This page exists now only so the
// quote-form pipeline required by Phase 4 (public submission → lead
// creation → source tracking) is real and testable; Phase 15 will restyle
// it to match the finished site.
//
// Forces per-request rendering: this page reads live service-area data
// (editable from the dashboard), so a build-time snapshot would go stale.
// Without this, Next.js's automatic static optimization prerenders it at
// `next build` time, which requires DATABASE_URL to be available during
// the build step itself — Netlify's build environment doesn't have it,
// causing the build to fail entirely rather than just this page being stale.
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const db = getDb();
  const serviceAreas = await listActiveServiceAreas(db);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Get a Free Quote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your plumbing issue and we&apos;ll get back to you.
        </p>
      </div>
      <ContactForm serviceAreas={serviceAreas} />
    </div>
  );
}
