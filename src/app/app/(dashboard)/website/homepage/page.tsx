import { getDb } from "@/lib/db/client";
import { listHomepageSections } from "@/lib/website/homepage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomepageSectionForm } from "./homepage-section-form";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero (top banner)",
  services: "Services",
  why_mr_drain: "Why Mr. Drain",
  service_areas: "Service Areas",
  gallery: "Gallery",
  reviews: "Reviews",
  cta: "Call to Action (bottom banner)",
};

export default async function WebsiteHomepagePage() {
  const db = getDb();
  const sections = await listHomepageSections(db);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
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
                {SECTION_LABELS[section.sectionType] ?? section.sectionType}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HomepageSectionForm section={section} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
