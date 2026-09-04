import { getDb } from "@/lib/db/client";
import { listServicesForAdmin } from "@/lib/website/services";
import { EditorShell } from "../editor-shell";
import { ServicesEditor } from "./services-editor";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorServicesPage() {
  const db = getDb();
  const services = await listServicesForAdmin(db);

  return (
    <div className="-m-6">
      <EditorShell active="services" />
      <ServicesEditor services={services} />
    </div>
  );
}
