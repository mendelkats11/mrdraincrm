"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelReminderAction,
  completeReminderAction,
  dismissReminderAction,
  reopenReminderAction,
} from "@/lib/reminders/reminder-actions";
import { Button } from "@/components/ui/button";

export function ReminderRowActions({
  reminderId,
  completedAt,
  cancelledAt,
  showDismiss,
}: {
  reminderId: string;
  completedAt: Date | null;
  cancelledAt: Date | null;
  showDismiss: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string } | undefined>) {
    startTransition(async () => {
      const result = await action();
      if (result?.ok || result === undefined) {
        setError(null);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (completedAt || cancelledAt) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(() => reopenReminderAction(reminderId))}
        >
          Reopen
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {showDismiss ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() => dismissReminderAction(reminderId).then(() => ({ ok: true as const })))
            }
          >
            Dismiss
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => completeReminderAction(reminderId))}
        >
          Complete
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => run(() => cancelReminderAction(reminderId))}
        >
          Don&apos;t show again
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
