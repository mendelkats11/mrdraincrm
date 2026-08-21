import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { listActiveServiceAreas } from "@/lib/crm/leads";
import { getWebsiteSettings } from "@/lib/website/settings";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get a Free Quote | Mr. Drain Plumbing",
  description: "Request a free plumbing quote from Mr. Drain Plumbing — Saskatoon and area.",
};

export default async function ContactPage() {
  const db = getDb();
  const [serviceAreas, settings] = await Promise.all([
    listActiveServiceAreas(db),
    getWebsiteSettings(db),
  ]);

  return (
    <div className="bg-brand-cream py-16">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-navy">Get a Free Quote</h1>
          <p className="mt-2 text-foreground/70">
            Tell us about your plumbing issue and we&apos;ll get back to you shortly.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <ContactForm serviceAreas={serviceAreas} />
        </div>
        {settings.defaultCallrailTrackingNumber ? (
          <p className="text-center text-sm text-foreground/60">
            Prefer to talk now?{" "}
            <a
              href={`tel:${settings.defaultCallrailTrackingNumber}`}
              className="font-medium text-primary"
            >
              Call {settings.defaultCallrailTrackingNumber}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}
