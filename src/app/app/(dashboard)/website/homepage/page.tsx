import { getDb } from "@/lib/db/client";
import { listHomepageSections } from "@/lib/website/homepage";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SitePreviewPane } from "@/components/site-preview-pane";
import { HOMEPAGE_SECTION_LABELS } from "@/components/site/homepage-section-renderer";
import { HomepageSectionForm } from "./homepage-section-form";

export default async function WebsiteHomepagePage() {
  const db = getDb();
  const sections = await listHomepageSections(db);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Homepage</h1>
          <p className="text-sm text-muted-foreground">
            Sections appear on the homepage in this order. Toggle a section off to hide it without
            losing its content.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {HOMEPAGE_SECTION_LABELS[section.sectionType] ?? section.sectionType}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HomepageSectionForm section={section} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SitePreviewPane origin={getPublicSiteOrigin()} path="/" />
    </div>
  );
}
