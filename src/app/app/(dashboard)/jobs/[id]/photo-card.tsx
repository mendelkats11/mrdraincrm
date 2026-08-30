"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteJobPhotoAction, recategorizeJobPhotoAction } from "@/lib/jobs/job-photo-actions";
import type { JobPhotoWithUrl } from "@/lib/jobs/job-photos";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const CATEGORIES = [
  { value: "before", label: "Before" },
  { value: "during", label: "During" },
  { value: "after", label: "After" },
  { value: "other", label: "Other" },
] as const;

export function PhotoCard({ jobId, photo }: { jobId: string; photo: JobPhotoWithUrl }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2" data-testid="job-photo-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed R2 URLs, not a Next-optimizable local/static source */}
      <img
        src={photo.signedUrl}
        alt={photo.caption ?? "Job photo"}
        className="aspect-square w-full rounded-md object-cover"
      />
      {photo.caption ? <p className="text-xs text-muted-foreground">{photo.caption}</p> : null}
      <Select
        value={photo.category}
        disabled={pending}
        onValueChange={(next) => {
          startTransition(async () => {
            await recategorizeJobPhotoAction(jobId, photo.id, next);
            router.refresh();
          });
        }}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the photo from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteJobPhotoAction(jobId, photo.id);
                  setConfirmOpen(false);
                  router.refresh();
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
