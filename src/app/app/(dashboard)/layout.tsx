import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { LogoutButtons } from "./logout-buttons";
import { Sidebar } from "./sidebar";
import { HeaderSearch } from "./header-search";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
          <HeaderSearch />
          <div className="flex shrink-0 items-center gap-4">
            <span className="text-sm font-medium text-foreground">{session.user.email}</span>
            <LogoutButtons />
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
