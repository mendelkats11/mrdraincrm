import {
  listReminders,
  type ReminderStatusFilter,
  type ReminderRecurrence,
} from "@/lib/reminders/reminders";
import { classifyReminderTiming } from "@/lib/reminders/status";
import { BUSINESS_TIMEZONE } from "@/lib/reminders/timezone";
import { getDb } from "@/lib/db/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { NewReminderDialog } from "./new-reminder-dialog";
import { ReminderFilters } from "./reminder-filters";
import { ReminderStatusBadge } from "./reminder-status-badge";
import { ReminderRowActions } from "./reminder-row-actions";
import { EditReminderDialog } from "./edit-reminder-dialog";

const PAGE_SIZE = 50;
// Priority was previously always shown as the same neutral outline badge
// regardless of value — same bug class as the other status badges.
const PRIORITY_VARIANTS: Record<string, BadgeProps["variant"]> = {
  low: "outline",
  medium: "info",
  high: "warning",
};
const VALID_STATUSES: ReminderStatusFilter[] = [
  "active",
  "overdue",
  "due_today",
  "upcoming",
  "completed",
  "cancelled",
  "all",
];
const VALID_RECURRENCE: ReminderRecurrence[] = [
  "one_time",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];

const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: BUSINESS_TIMEZONE,
});

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; recurrence?: string; page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  const status = VALID_STATUSES.includes(params.status as ReminderStatusFilter)
    ? (params.status as ReminderStatusFilter)
    : "active";
  const recurrence = VALID_RECURRENCE.includes(params.recurrence as ReminderRecurrence)
    ? (params.recurrence as ReminderRecurrence)
    : "all";

  const now = new Date();
  const { rows, total } = await listReminders(
    db,
    { status, recurrence, page: params.page ? Number(params.page) : 1, pageSize: PAGE_SIZE },
    now,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Reminders</h1>
        <NewReminderDialog />
      </div>

      <ReminderFilters />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No reminders here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Related to</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((reminder) => {
                const active = !reminder.completedAt && !reminder.cancelledAt;
                const timing = active ? classifyReminderTiming(reminder.dueAt, now) : null;
                const related =
                  reminder.organizationName ??
                  reminder.contactName ??
                  reminder.propertyAddressLine1 ??
                  reminder.jobNumber ??
                  "—";

                return (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">{reminder.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {DATE_FMT.format(reminder.dueAt)}
                    </TableCell>
                    <TableCell>
                      <ReminderStatusBadge
                        dueAt={reminder.dueAt}
                        completedAt={reminder.completedAt}
                        cancelledAt={reminder.cancelledAt}
                        now={now}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={PRIORITY_VARIANTS[reminder.priority] ?? "outline"}
                        className="capitalize"
                      >
                        {reminder.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{related}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {active ? <EditReminderDialog reminder={reminder} /> : null}
                        <ReminderRowActions
                          reminderId={reminder.id}
                          completedAt={reminder.completedAt}
                          cancelledAt={reminder.cancelledAt}
                          showDismiss={timing === "overdue" || timing === "due_today"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
      ) : null}
    </div>
  );
}
