"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createReminderAction } from "@/lib/reminders/reminder-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// docs/PROJECT_SPEC.md §17 "Presets" — quick title fill-ins, not a stored
// enum; title stays free text either way.
const PRESETS = [
  "Call customer",
  "Follow up",
  "Collect payment",
  "Send invoice",
  "Send quote",
  "Check job",
  "Contractor follow-up",
];

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function NewReminderDialog({
  contactId,
  organizationId,
  propertyId,
  jobId,
  triggerLabel = "+ New Reminder",
}: {
  contactId?: string;
  organizationId?: string;
  propertyId?: string;
  jobId?: string;
  triggerLabel?: string;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [open, setOpen] = useState(() => searchParams.get("new") === "1");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Global "+ New" quick action (docs/PROJECT_SPEC.md §23) opens this via
  // ?new=1 — see new-lead-dialog.tsx for the identical pattern. Harmless on
  // instances of this dialog embedded elsewhere (e.g. a job's detail page)
  // since only /reminders is ever linked with the param.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createReminderAction(undefined, formData);
      if (result?.ok) {
        setOpen(false);
        setError(null);
        setTitle("");
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New reminder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
          {organizationId ? (
            <input type="hidden" name="organizationId" value={organizationId} />
          ) : null}
          {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}
          {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={defaultDueDate()}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueTime">Due time</Label>
              <Input id="dueTime" name="dueTime" type="time" defaultValue="09:00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recurrence">Repeat</Label>
              <Select name="recurrence" defaultValue="one_time">
                <SelectTrigger id="recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
