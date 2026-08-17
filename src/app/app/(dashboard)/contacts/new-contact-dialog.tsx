"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContactAction } from "@/lib/crm/contact-actions";
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

// A contact must be creatable entirely on its own — no job/property/
// organization required — and creation should stay fast, per the approved
// Phase 3 plan. This form asks for only what's needed to identify someone;
// everything else (additional phones/relationships/notes) is added from
// the detail page.
export function NewContactDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createContactAction(undefined, formData);
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
        <Button>+ New Contact</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Name</Label>
            <Input id="displayName" name="displayName" required autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" placeholder="(306) 555-1234" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source">Source</Label>
            <Input id="source" name="source" placeholder="e.g. website, referral" />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
