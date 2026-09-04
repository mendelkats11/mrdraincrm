import { getDb } from "@/lib/db/client";
import { listServiceAreasForAdmin } from "@/lib/website/service-areas";
import { EditorShell } from "../editor-shell";
import { ServiceAreasEditor } from "./service-areas-editor";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorServiceAreasPage() {
  const db = getDb();
  const serviceAreas = await listServiceAreasForAdmin(db);

  return (
    <div className="-m-6">
      <EditorShell active="service-areas" />
      <ServiceAreasEditor serviceAreas={serviceAreas} />
    </div>
  );
}
