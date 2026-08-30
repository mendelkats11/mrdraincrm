"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { convertLeadToJobAction } from "@/lib/crm/lead-actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Creates a real jobs row (Phase 4 approved decision) — there is no job
// detail page yet (that's Phase 5), so success is shown as plain text on
// this lead rather than a link.
export function ConvertToJobButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <Button variant="success" onClick={() => setOpen(true)}>
        Convert to Job
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert this lead to a job?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a job record and assigns it the next sequential job number. The lead will
              be marked Won and linked to the new job. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="success"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await convertLeadToJobAction(leadId);
                  if (result?.ok) {
                    setOpen(false);
                    setError(null);
                    router.refresh();
                  } else {
                    setError(result?.error ?? "Something went wrong.");
                  }
                });
              }}
            >
              {pending ? "Converting…" : "Convert to Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
