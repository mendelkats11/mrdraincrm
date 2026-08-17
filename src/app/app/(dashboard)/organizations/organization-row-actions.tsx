"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  archiveOrganizationAction,
  unarchiveOrganizationAction,
} from "@/lib/crm/organization-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export function OrganizationRowActions({
  organizationId,
  archived,
}: {
  organizationId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Organization actions">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => router.push(`/organizations/${organizationId}`)}>
            View
          </DropdownMenuItem>
          {archived ? (
            <DropdownMenuItem
              onSelect={() =>
                startTransition(async () => {
                  await unarchiveOrganizationAction(organizationId);
                  router.refresh();
                })
              }
            >
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
