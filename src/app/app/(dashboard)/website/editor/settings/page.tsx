import { getDb } from "@/lib/db/client";
import { getWebsiteSettings } from "@/lib/website/settings";
import { EditorShell } from "../editor-shell";
import { SettingsEditor } from "./settings-editor";

export const dynamic = "force-dynamic";

export default async function WebsiteEditorSettingsPage() {
  const db = getDb();
  const settings = await getWebsiteSettings(db);

  return (
    <div className="-m-6">
      <EditorShell active="settings" />
      <SettingsEditor settings={settings} />
    </div>
  );
}
