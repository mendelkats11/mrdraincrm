import { getDb } from "@/lib/db/client";
import { listServiceAreasForTrackingConfig } from "@/lib/callrail/service-areas";
import { TrackingNumberRow } from "./tracking-number-row";

// Tracking-number editing only, not general service-area content — the
// full Website CMS (name/copy/images/SEO) is docs/ROADMAP.md Phase 15.
export default async function TrackingNumbersPage() {
  const db = getDb();
  const serviceAreas = await listServiceAreasForTrackingConfig(db);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tracking numbers</h1>
        <p className="text-sm text-muted-foreground">
          Each service area&apos;s CallRail tracking number, used for incoming call matching and the
          public site&apos;s Call Now buttons.
        </p>
      </div>

      {serviceAreas.length === 0 ? (
        <p className="text-sm text-muted-foreground">No service areas configured yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {serviceAreas.map((area) => (
            <TrackingNumberRow
              key={area.id}
              serviceAreaId={area.id}
              name={area.name}
              trackingNumber={area.callrailTrackingNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}
