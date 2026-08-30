"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Calendar,
  FileSignature,
  FileText,
  Globe,
  HardHat,
  Home,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Phone,
  User,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_HREFS } from "@/lib/dashboard/sidebar-nav";
import { SidebarCustomizer } from "./sidebar-customizer";

const ICONS_BY_HREF = {
  "/": LayoutDashboard,
  "/forms": Inbox,
  "/jobs": Wrench,
  "/schedule": Calendar,
  "/contractors": HardHat,
  "/invoices": FileText,
  "/quotes": FileSignature,
  "/reminders": Bell,
  "/calls": Phone,
  "/messages": MessageSquare,
  "/contacts": User,
  "/properties": Home,
  "/website": Globe,
  "/reports": BarChart3,
} as const;

const LABELS_BY_HREF: Record<(typeof NAV_HREFS)[number], string> = {
  "/": "Dashboard",
  "/forms": "Form Submissions",
  "/jobs": "Jobs",
  "/schedule": "Schedule",
  "/contractors": "Contractors",
  "/invoices": "Invoices",
  "/quotes": "Quotes",
  "/reminders": "Reminders",
  "/calls": "Calls",
  "/messages": "Messages",
  "/contacts": "Contacts",
  "/properties": "Properties",
  "/website": "Website",
  "/reports": "Reports",
};

export const NAV_ITEMS = NAV_HREFS.map((href) => ({
  href,
  label: LABELS_BY_HREF[href],
  icon: ICONS_BY_HREF[href],
}));

export function Sidebar({
  visibleOrder,
  savedOrder,
  savedHidden,
  collapsed,
}: {
  /** Already reordered + hidden-items-removed — see applyOrderAndVisibility
   *  (src/lib/preferences/apply-order.ts), computed server-side in
   *  layout.tsx from the signed-in user's saved preferences. */
  visibleOrder: string[];
  /** Raw saved fields, passed through to SidebarCustomizer so its edit UI
   *  starts from what's actually saved (including hidden items, which
   *  visibleOrder has already dropped) rather than the app defaults. */
  savedOrder: string[];
  savedHidden: string[];
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const itemsByHref = new Map(NAV_ITEMS.map((item) => [item.href, item]));
  const items = visibleOrder
    .map((href) => itemsByHref.get(href as (typeof NAV_ITEMS)[number]["href"]))
    .filter((item): item is (typeof NAV_ITEMS)[number] => item !== undefined);

  return (
    <nav
      className={cn(
        // The app already defines a dedicated --sidebar/--sidebar-accent/
        // --sidebar-border token family in globals.css for exactly this —
        // giving the sidebar its own subtle surface, distinct from the
        // main content area, rather than sharing the page background and
        // reading as one undifferentiated flat panel.
        //
        // Below lg, this is an off-canvas drawer (fixed, slid out via the
        // "sidebar-toggle" checkbox in layout.tsx — peer-checked here, see
        // that file's comment for why a checkbox rather than client state)
        // rather than the permanent rail DESIGN_SYSTEM.md §6 specifies for
        // desktop — there was previously no mobile nav at all, just this
        // same full-width rail always rendered inline, forcing horizontal
        // scroll on every single page on a phone.
        "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col gap-1 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-transform duration-200 peer-checked:translate-x-0 lg:static lg:z-auto lg:w-56 lg:translate-x-0 lg:shrink-0",
        collapsed && "lg:w-14 lg:items-center",
      )}
    >
      <Link
        href="/"
        title={collapsed ? "Mr. Drain CRM" : undefined}
        className={cn(
          "mb-3 flex items-center gap-2 rounded-md px-3 py-2 font-heading text-lg font-bold tracking-tight text-primary",
          collapsed && "lg:justify-center lg:px-2",
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
          M
        </span>
        <span className={collapsed ? "lg:hidden" : undefined}>Mr. Drain</span>
      </Link>
      <div className="flex w-full flex-1 flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "lg:justify-center lg:px-2",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className={collapsed ? "lg:hidden" : undefined}>{item.label}</span>
            </Link>
          );
        })}
      </div>
      <SidebarCustomizer savedOrder={savedOrder} savedHidden={savedHidden} collapsed={collapsed} />
    </nav>
  );
}
