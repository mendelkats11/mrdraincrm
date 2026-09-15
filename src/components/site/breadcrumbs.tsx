import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbCrumb } from "@/lib/seo/breadcrumb-schema";

/**
 * Visible breadcrumb trail matching the BreadcrumbList JSON-LD each page
 * already emits (see breadcrumbSchema) — the schema alone lets Google show
 * a breadcrumb in the SERP snippet, but it doesn't help an actual visitor
 * on the page, and Google's own guidance is that structured data should
 * reflect visible content. Same `crumbs` array powers both.
 */
export function Breadcrumbs({ crumbs }: { crumbs: BreadcrumbCrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="relative mx-auto max-w-6xl px-4 pt-4 text-sm">
      {/* `relative` isn't for layout here — a couple of pages (Services,
          Contact) render this over a full-bleed `position: absolute`
          background image, and a plain non-positioned element would paint
          *behind* that background per CSS's stacking order regardless of
          DOM position. Being positioned itself is what puts it back on
          top, on every page, harmlessly (no offset is set). */}
      <ol className="flex flex-wrap items-center gap-1.5 text-foreground/60">
        {crumbs.map((crumb, i) => (
          <li key={crumb.path} className="flex items-center gap-1.5">
            {i > 0 ? (
              <ChevronRight className="size-3.5 text-foreground/30" aria-hidden="true" />
            ) : null}
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="font-medium text-foreground">
                {crumb.name}
              </span>
            ) : (
              <Link href={crumb.path} className="hover:text-primary hover:underline">
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
