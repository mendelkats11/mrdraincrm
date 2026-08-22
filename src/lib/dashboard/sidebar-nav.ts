// Plain data, deliberately NOT in sidebar.tsx ("use client"): a server
// component (layout.tsx) needs DEFAULT_SIDEBAR_ORDER too, and importing a
// non-component value out of a "use client" module doesn't resolve to the
// real value across the RSC boundary — Next.js replaces every export of a
// client module with a serializable reference, which breaks as soon as
// server code tries to actually use it as data (e.g. `new Set(fn)`).
export const NAV_HREFS = [
  "/",
  "/leads",
  "/forms",
  "/jobs",
  "/schedule",
  "/contractors",
  "/invoices",
  "/quotes",
  "/reminders",
  "/calls",
  "/messages",
  "/contacts",
  "/properties",
  "/website",
  "/reports",
] as const;

export const DEFAULT_SIDEBAR_ORDER: string[] = [...NAV_HREFS];
