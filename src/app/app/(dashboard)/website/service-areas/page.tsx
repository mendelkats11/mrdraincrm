import { redirect } from "next/navigation";

// Superseded by the Service Areas page in the visual editor (website
// editor overhaul, phase 4). Redirects rather than 404s so an old bookmark
// or sidebar shortcut still lands somewhere useful. The old page's region
// filter dropdown has no equivalent here yet — a small gap, acceptable for
// now given how few areas exist; worth revisiting if that list grows.
export default function WebsiteServiceAreasRedirectPage() {
  redirect("/website/editor/service-areas");
}
