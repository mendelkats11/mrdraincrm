import { redirect } from "next/navigation";

// Superseded by Home in the visual editor (website editor overhaul, phase
// 3) — redirects rather than 404s so an old bookmark or sidebar shortcut
// still lands somewhere useful. homepage-section-form.tsx in this folder
// is still very much alive — the new editor's side panel imports it
// directly — only this classic per-section list page is retired.
export default function WebsiteHomepageRedirectPage() {
  redirect("/website/editor");
}
