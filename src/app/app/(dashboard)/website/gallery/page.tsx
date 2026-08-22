import { getDb } from "@/lib/db/client";
import { listGalleryItemsForAdmin } from "@/lib/website/gallery";
import { listPublishedServices } from "@/lib/website/services";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { SitePreviewPane } from "@/components/site-preview-pane";
import { GalleryUploadForm } from "./gallery-upload-form";
import { GalleryItemCard } from "./gallery-item-card";

export default async function WebsiteGalleryPage() {
  const db = getDb();
  const [items, services, serviceAreas] = await Promise.all([
    listGalleryItemsForAdmin(db),
    listPublishedServices(db),
    listPublishedServiceAreas(db),
  ]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Gallery</h1>
          <p className="text-sm text-muted-foreground">
            Real completed-job photos shown on the public Gallery page and homepage. Only real work
            — nothing here should be stock or placeholder imagery.
          </p>
        </div>

        <GalleryUploadForm
          services={services.map((s) => ({ id: s.id, name: s.name }))}
          serviceAreas={serviceAreas.map((a) => ({ id: a.id, name: a.name }))}
        />

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No photos uploaded yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <GalleryItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <SitePreviewPane origin={getPublicSiteOrigin()} path="/gallery" />
    </div>
  );
}
