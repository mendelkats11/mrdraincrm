import { redirect } from "next/navigation";

// The "6 tiles" hub is gone — every page (Home/Jobs/Services/Service
// Areas/Reviews/Branding & Contact) now lives in the visual editor with
// its own click/blur-to-save treatment, so there's nothing left for a hub
// to route between. The sidebar's "Website" link lands straight in the
// editor instead of an intermediate page.
export default function WebsiteRedirectPage() {
  redirect("/website/editor");
}
