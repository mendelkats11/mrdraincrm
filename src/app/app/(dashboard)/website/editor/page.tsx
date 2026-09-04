import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { listHomepageSections } from "@/lib/website/homepage";
import { listPublishedServices } from "@/lib/website/services";
import { listPublishedServiceAreas } from "@/lib/website/service-areas";
import { listPublishedPortfolioJobs } from "@/lib/website/portfolio-jobs";
import { listPublishedReviews } from "@/lib/website/reviews";
import { EditorShell } from "./editor-shell";
import { HomepageEditor } from "./homepage-editor";

export const dynamic = "force-dynamic";

/**
 * The one place to open to edit the website — replaces navigating into one
 * of the "Website" hub's 6 separate tiles. Renders the real homepage
 * section components (via renderHomepageSection, shared 1:1 with the live
 * site) directly in the admin, with hover-to-edit affordances, instead of a
 * side-by-side "form here, iframe preview over there" layout.
 *
 * Home, Jobs (website/editor/jobs), Services, Service Areas, and Reviews
 * all get this in-context treatment now — only Branding & Contact (a
 * settings form, not a content list) still routes to its classic page.
 */
export default async function WebsiteEditorPage() {
  const db = getDb();
  const [settings, sections, services, serviceAreas, portfolioJobs, reviews] = await Promise.all([
    getWebsiteSettings(db),
    listHomepageSections(db),
    listPublishedServices(db),
    listPublishedServiceAreas(db),
    listPublishedPortfolioJobs(db),
    listPublishedReviews(db),
  ]);
  const data = { settings, services, serviceAreas, portfolioJobs, reviews };

  return (
    <div className="-m-6">
      <EditorShell active="home" />
      <div className="bg-muted/40">
        <HomepageEditor sections={sections} data={data} />
      </div>
    </div>
  );
}
