import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getPublicSiteOrigin } from "@/lib/site-url";

type PageKey = "home" | "services" | "service-areas" | "gallery" | "reviews" | "settings";

const PAGES: { key: PageKey; label: string; href: string; visual: boolean }[] = [
  { key: "home", label: "Home", href: "/website/editor", visual: true },
  { key: "services", label: "Services", href: "/website/services", visual: false },
  { key: "service-areas", label: "Service Areas", href: "/website/service-areas", visual: false },
  { key: "gallery", label: "Gallery", href: "/website/gallery", visual: false },
  { key: "reviews", label: "Reviews", href: "/website/reviews", visual: false },
  { key: "settings", label: "Branding & Contact", href: "/website/settings", visual: false },
];

/**
 * The page switcher — one bar you navigate the whole site from, instead of
 * the "Website" hub's 6 separate destinations. Only Home has the full
 * click-to-edit treatment so far (visual: true); the rest still route to
 * their existing classic screens until they get the same treatment, but
 * they're reachable from the same bar rather than a different menu.
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
