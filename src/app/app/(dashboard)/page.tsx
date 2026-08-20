import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/require-user";
import { getDb } from "@/lib/db/client";
import { listReminders } from "@/lib/reminders/reminders";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import { NewReminderDialog } from "./reminders/new-reminder-dialog";
import { ReminderStatusBadge } from "./reminders/reminder-status-badge";

const SECTIONS = [
  {
    href: "/leads",
    label: "Leads",
    description: "Incoming interest, from the website or entered manually.",
  },
  {
    href: "/jobs",
    label: "Jobs",
    description: "Work to be done, with or without a lead behind it.",
  },
  {
    href: "/contacts",
    label: "Contacts",
    description: "People, on their own or linked to a property/organization.",
  },
  {
    href: "/organizations",
    label: "Organizations",
    description: "Companies and property managers.",
  },
  {
    href: "/properties",
    label: "Properties",
    description: "Service locations, residential or commercial.",
  },
] as const;

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

export default async function DashboardPage() {
  const session = await requireUser();
  const db = getDb();

  const now = new Date();
  const [overdue, dueToday, upcoming] = await Promise.all([
    listReminders(db, { status: "overdue", pageSize: 10 }, now),
    listReminders(db, { status: "due_today", pageSize: 10 }, now),
    listReminders(db, { status: "upcoming", pageSize: 5 }, now),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Welcome, {session.user.name}</h1>
        <p className="text-sm text-muted-foreground">
          Reminders below need your attention. Everything else is in the sidebar.
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Reminders</h2>
          <NewReminderDialog triggerLabel="+ New Reminder" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card data-testid="overdue-reminders-card">
            <CardHeader>
              <CardTitle className="text-base">Overdue</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {overdue.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing overdue.</p>
              ) : (
                overdue.rows.map((r) => (
                  <Link
                    key={r.id}
                    href="/reminders"
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                  >
                    <span className="truncate">{r.title}</span>
                    <ReminderStatusBadge
                      dueAt={r.dueAt}
                      completedAt={r.completedAt}
                      cancelledAt={r.cancelledAt}
                      now={now}
                    />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card data-testid="due-today-reminders-card">
            <CardHeader>
              <CardTitle className="text-base">Due today</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {dueToday.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing due today.</p>
              ) : (
                dueToday.rows.map((r) => (
                  <Link
                    key={r.id}
                    href="/reminders"
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                  >
                    <span className="truncate">{r.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {DATE_FMT.format(r.dueAt)}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card data-testid="upcoming-reminders-card">
            <CardHeader>
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {upcoming.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing upcoming.</p>
              ) : (
                upcoming.rows.map((r) => (
                  <Link
                    key={r.id}
                    href="/reminders"
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted/50"
                  >
                    <span className="truncate">{r.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {DATE_FMT.format(r.dueAt)}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <CardTitle>{section.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {section.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
