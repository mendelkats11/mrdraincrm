import { redirect } from "next/navigation";

// Superseded by Branding & Contact in the visual editor (website editor
// overhaul, phase 5) — every field there saves on blur, no submit button.
// Redirects rather than 404s so an old bookmark or sidebar shortcut still
// lands somewhere useful.
export default function WebsiteSettingsRedirectPage() {
  redirect("/website/editor/settings");
}
