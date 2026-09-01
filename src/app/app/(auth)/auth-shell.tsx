import type { ReactNode } from "react";

/** Shared wrapper for every unauthenticated screen (login, forgot-password,
 *  accept-invite, reset-password) — previously each page duplicated the
 *  same plain `flex min-h-screen items-center justify-center bg-background`
 *  div. Centralizing it here means the one visual treatment for "you are
 *  not signed in yet" — the brand gradient backdrop, the wordmark — only
 *  needs to exist in one place. A rich gradient here (rather than the
 *  admin's normal flat background) is deliberate: this is the one screen
 *  where there's no data-density constraint working against it, so it's
 *  the natural place to spend a bit of visual ambition. Deliberately no
 *  blurred blob shapes or frosted-glass panels on top of it though — a
 *  clean two-stop gradient reads as an intentional brand moment; those
 *  read as the generic "AI SaaS landing page" look overhaul.md §44 warns
 *  against. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-brand-deep)] p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-primary-foreground">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-lg font-bold shadow-sm">
            M
          </span>
          <span className="font-heading text-xl font-semibold tracking-tight">Mr. Drain</span>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
