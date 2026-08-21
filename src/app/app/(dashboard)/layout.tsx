import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { getDb } from "@/lib/db/client";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
} from "@/lib/notifications/notifications";
import { getUserPreferences } from "@/lib/preferences/user-preferences";
import { applyOrderAndVisibility } from "@/lib/preferences/apply-order";
import { DEFAULT_SIDEBAR_ORDER } from "@/lib/dashboard/sidebar-nav";
import { LogoutButtons } from "./logout-buttons";
import { Sidebar } from "./sidebar";
import { HeaderSearch } from "./header-search";
import { NotificationBell } from "./notification-bell";
import { QuickActionsMenu } from "./quick-actions-menu";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const db = getDb();
  const [notifications, unreadCount, prefs] = await Promise.all([
    listNotificationsForUser(db, session.user.id),
    getUnreadNotificationCount(db, session.user.id),
    getUserPreferences(db, session.user.id),
  ]);
  const visibleOrder = applyOrderAndVisibility(
    DEFAULT_SIDEBAR_ORDER,
    prefs.sidebarItemOrder,
    prefs.sidebarItemHidden,
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        visibleOrder={visibleOrder}
        savedOrder={prefs.sidebarItemOrder}
        savedHidden={prefs.sidebarItemHidden}
        collapsed={prefs.sidebarCollapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <HeaderSearch />
          <div className="flex shrink-0 items-center gap-4">
            <QuickActionsMenu />
            <NotificationBell notifications={notifications} unreadCount={unreadCount} />
            <span className="text-sm font-medium text-foreground">{session.user.email}</span>
            <LogoutButtons />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
