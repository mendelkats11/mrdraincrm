import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * One consistent "← Back to X" pattern for every detail page — plain
 * next/link (real browser navigation, works with back/forward, no client
 * history hacks), same compact/muted treatment everywhere so a user who
 * clicked into a record from anywhere always has an obvious, predictable
 * way back to its list.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}
