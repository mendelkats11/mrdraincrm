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
        "flex shrink-0 flex-col gap-1 border-r bg-background p-3",
        collapsed ? "w-14 items-center" : "w-56",
      )}
    >
      <Link
        href="/"
        title={collapsed ? "Mr. Drain CRM" : undefined}
        className={cn(
          "mb-2 flex items-center gap-2 rounded-md px-3 py-2 font-heading font-bold tracking-tight text-primary",
          collapsed ? "justify-center px-2 text-lg" : "text-lg",
        )}
      >
        {collapsed ? "MD" : "Mr. Drain CRM"}
      </Link>
      <div className="flex w-full flex-1 flex-col gap-1 overflow-y-auto">
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
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {collapsed ? null : item.label}
            </Link>
          );
        })}
      </div>
      <SidebarCustomizer savedOrder={savedOrder} savedHidden={savedHidden} collapsed={collapsed} />
    </nav>
  );
}
