"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archivePropertyAction, unarchivePropertyAction } from "@/lib/crm/property-actions";
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

export function ArchiveButton({ propertyId, archived }: { propertyId: string; archived: boolean }) {
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
            await unarchivePropertyAction(propertyId);
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
            <AlertDialogTitle>Archive this property?</AlertDialogTitle>
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
                  await archivePropertyAction(propertyId);
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
