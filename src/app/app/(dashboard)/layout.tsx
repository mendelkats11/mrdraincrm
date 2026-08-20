import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { getDb } from "@/lib/db/client";
import {
  getUnreadNotificationCount,
  listNotificationsForUser,
} from "@/lib/notifications/notifications";
import { LogoutButtons } from "./logout-buttons";
import { Sidebar } from "./sidebar";
import { HeaderSearch } from "./header-search";
import { NotificationBell } from "./notification-bell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();
  const db = getDb();
  const [notifications, unreadCount] = await Promise.all([
    listNotificationsForUser(db, session.user.id),
    getUnreadNotificationCount(db, session.user.id),
  ]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <HeaderSearch />
          <div className="flex shrink-0 items-center gap-4">
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
