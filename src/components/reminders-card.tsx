"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeReminderAction } from "@/lib/reminders/reminder-actions";
import type { ReminderPriority } from "@/lib/reminders/reminders";
import { Button } from "@/components/ui/button";
import { NewReminderDialog } from "@/app/app/(dashboard)/reminders/new-reminder-dialog";
import { ReminderStatusBadge } from "@/app/app/(dashboard)/reminders/reminder-status-badge";

export interface EntityReminderRow {
  id: string;
  title: string;
  dueAt: Date;
  priority: ReminderPriority;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

/** Reusable "Reminders" card for the Job/Contact/Lead detail pages — quick
 *  add + a Complete shortcut, matching the "only show existing reminders,
 *  full editing lives on /reminders" scope used throughout this feature. */
export function RemindersCard({
  reminders,
  contactId,
  organizationId,
  propertyId,
  jobId,
}: {
  reminders: EntityReminderRow[];
  contactId?: string;
  organizationId?: string;
  propertyId?: string;
  jobId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reminders yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <span className="truncate">{r.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                <ReminderStatusBadge
                  dueAt={r.dueAt}
                  completedAt={r.completedAt}
                  cancelledAt={r.cancelledAt}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await completeReminderAction(r.id);
                      router.refresh();
                    })
                  }
                >
                  Complete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NewReminderDialog
        contactId={contactId}
        organizationId={organizationId}
        propertyId={propertyId}
        jobId={jobId}
        triggerLabel="+ Add Reminder"
      />
    </div>
  );
}
