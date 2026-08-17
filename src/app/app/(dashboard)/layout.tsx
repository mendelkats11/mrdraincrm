import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/require-user";
import { LogoutButtons } from "./logout-buttons";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await requireUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-sm font-medium text-foreground">
          Mr. Drain — signed in as {session.user.email}
        </span>
        <LogoutButtons />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">{children}</main>
    </div>
  );
}
