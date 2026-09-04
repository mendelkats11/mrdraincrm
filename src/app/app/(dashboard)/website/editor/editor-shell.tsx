import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getPublicSiteOrigin } from "@/lib/site-url";

type PageKey = "home" | "jobs" | "services" | "service-areas" | "reviews" | "settings";

const PAGES: { key: PageKey; label: string; href: string; visual: boolean }[] = [
  { key: "home", label: "Home", href: "/website/editor", visual: true },
  { key: "jobs", label: "Jobs", href: "/website/editor/jobs", visual: true },
  { key: "services", label: "Services", href: "/website/editor/services", visual: true },
  {
    key: "service-areas",
    label: "Service Areas",
    href: "/website/editor/service-areas",
    visual: true,
  },
  { key: "reviews", label: "Reviews", href: "/website/editor/reviews", visual: true },
  { key: "settings", label: "Branding & Contact", href: "/website/settings", visual: false },
];

/**
 * The page switcher — one bar you navigate the whole site from, instead of
 * the "Website" hub's 6 separate destinations. Everything but Branding &
 * Contact (a settings form, not a content list) now has the full
 * click-to-edit treatment; Settings still routes to its classic screen.
 */
export function EditorShell({ active }: { active: PageKey }) {
  return (
    <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5 shadow-xs">
      <nav className="flex flex-wrap items-center gap-1" aria-label="Website pages">
        {PAGES.map((page) => (
          <Link
            key={page.key}
            href={page.href}
            aria-current={page.key === active ? "page" : undefined}
            className={
              page.key === active
                ? "rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          >
            {page.label}
            {!page.visual ? <span className="ml-1 text-xs text-muted-foreground/70">↗</span> : null}
          </Link>
        ))}
      </nav>
      <a
        href={getPublicSiteOrigin()}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        View live site
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
