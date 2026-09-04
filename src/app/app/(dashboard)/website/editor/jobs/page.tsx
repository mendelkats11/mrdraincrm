import { getDb } from "@/lib/db/client";
import { listPortfolioJobsForAdmin } from "@/lib/website/portfolio-jobs";
import { listServicesForAdmin } from "@/lib/website/services";
import { listServiceAreasForAdmin } from "@/lib/website/service-areas";
import { EditorShell } from "../editor-shell";
import { JobsEditor } from "./jobs-editor";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorJobsPage() {
  const db = getDb();
  const [jobs, services, serviceAreas] = await Promise.all([
    listPortfolioJobsForAdmin(db),
    listServicesForAdmin(db),
    listServiceAreasForAdmin(db),
  ]);

  return (
    <div className="-m-6">
      <EditorShell active="jobs" />
      <JobsEditor jobs={jobs} services={services} serviceAreas={serviceAreas} />
    </div>
  );
}
