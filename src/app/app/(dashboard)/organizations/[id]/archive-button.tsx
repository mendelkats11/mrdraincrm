"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveOrganizationAction,
  unarchiveOrganizationAction,
} from "@/lib/crm/organization-actions";
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

export function ArchiveButton({
  organizationId,
  archived,
}: {
  organizationId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (archived) {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await unarchiveOrganizationAction(organizationId);
            router.refresh();
          })
        }
      >
        Restore
      </Button>
    );
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
        Archive
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this organization?</AlertDialogTitle>
            <AlertDialogDescription>
              Hidden from the active list but not deleted — restore it anytime from the Archived
              filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await archiveOrganizationAction(organizationId);
                  router.refresh();
                })
              }
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
