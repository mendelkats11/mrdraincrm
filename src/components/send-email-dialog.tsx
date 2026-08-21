"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

type SendEmailAction = (
  prevState: { ok: true } | { ok: false; error: string } | undefined,
  formData: FormData,
) => Promise<{ ok: true } | { ok: false; error: string } | undefined>;

/**
 * Shared "send X by email" dialog — reused by invoices, quotes, and job
 * confirmations (Phase 14), which differ only in which id field they
 * submit, which action they call, and how the To field gets prefilled.
 * Sending never happens automatically anywhere in the app; this dialog is
 * the one explicit, owner-triggered entry point for every outbound
 * customer email.
 */
export function SendEmailDialog({
  entityId,
  idFieldName,
  triggerLabel,
  dialogTitle,
  resolveDefaultEmail,
  action,
  disabled,
}: {
  entityId: string;
  idFieldName: string;
  triggerLabel: string;
  dialogTitle: string;
  resolveDefaultEmail: (entityId: string) => Promise<string | null>;
  action: SendEmailAction;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [defaultEmail, setDefaultEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    resolveDefaultEmail(entityId).then((email) => setDefaultEmail(email ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(undefined, formData);
      if (result?.ok) {
        setOpen(false);
        setError(null);
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
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name={idFieldName} value={entityId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to">Send to</Label>
            <Input
              id="to"
              name="to"
              type="email"
              required
              autoFocus
              key={defaultEmail}
              defaultValue={defaultEmail}
              placeholder="customer@example.com"
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
