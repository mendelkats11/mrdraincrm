import { redirect } from "next/navigation";

// Superseded by the Jobs page in the visual editor (website editor
// overhaul, phase 4) — a flat photo upload here would never appear
// anywhere on the site any more, since the homepage/gallery pages now read
// portfolioJobs, not galleryItems. Redirects rather than 404s so an old
// bookmark or sidebar shortcut still lands somewhere useful.
export default function WebsiteGalleryRedirectPage() {
  redirect("/website/editor/jobs");
}
