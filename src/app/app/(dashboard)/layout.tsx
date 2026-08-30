import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getDb } from "@/lib/db/client";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
} from "@/lib/notifications/notifications";
import { getUserPreferences } from "@/lib/preferences/user-preferences";
import { applyOrderAndVisibility } from "@/lib/preferences/apply-order";
import { DEFAULT_SIDEBAR_ORDER } from "@/lib/dashboard/sidebar-nav";
import { Sidebar } from "./sidebar";
import { HeaderSearch } from "./header-search";
import { NotificationBell } from "./notification-bell";
import { QuickActionsMenu } from "./quick-actions-menu";
import { ProfileMenu } from "./profile-menu";

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
    // h-screen + overflow-hidden on the shell, rather than the old
    // min-h-screen, is what actually locks the sidebar in place — with
    // only min-h-screen, the whole page (sidebar included) was one single
    // scroll region, so scrolling a long page dragged the sidebar off-
    // screen with it. Only <main> below scrolls now.
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Pure-CSS drawer toggle — no client JS/state needed for something
          this simple (docs/overhaul.md's "avoid unnecessary client
          components" principle). Must precede both Sidebar and the
          backdrop below for the peer-checked selectors on each to work;
          the header's hamburger label just needs the matching htmlFor,
          it can live anywhere in the tree. One real limitation: since this
          layout persists across client-side navigations, the drawer
          doesn't auto-close after tapping a nav link — an extra tap on the
          backdrop or hamburger closes it. */}
      <input type="checkbox" id="sidebar-toggle" className="peer hidden" />
      <Sidebar
        visibleOrder={visibleOrder}
        savedOrder={prefs.sidebarItemOrder}
        savedHidden={prefs.sidebarItemHidden}
        collapsed={prefs.sidebarCollapsed}
      />
      <label
        htmlFor="sidebar-toggle"
        aria-hidden="true"
        className="fixed inset-0 z-40 hidden bg-black/40 peer-checked:block lg:hidden"
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b px-6 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <label
              htmlFor="sidebar-toggle"
              aria-label="Toggle navigation menu"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </label>
            <HeaderSearch />
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <QuickActionsMenu />
            <NotificationBell notifications={notifications} unreadCount={unreadCount} />
            <ProfileMenu name={session.user.name} email={session.user.email} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
