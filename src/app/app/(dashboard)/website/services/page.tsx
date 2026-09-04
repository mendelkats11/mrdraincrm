import { redirect } from "next/navigation";

// Superseded by the Services page in the visual editor (website editor
// overhaul, phase 4). Redirects rather than 404s so an old bookmark or
// sidebar shortcut still lands somewhere useful.
export default function WebsiteServicesRedirectPage() {
  redirect("/website/editor/services");
}
