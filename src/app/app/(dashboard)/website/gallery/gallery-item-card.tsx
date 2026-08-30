"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import {
  deleteGalleryItemAction,
  setGalleryItemFeaturedAction,
  setGalleryItemHiddenAction,
} from "@/lib/website/gallery-actions";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { galleryItems } from "@/lib/db/schema";

type GalleryItem = typeof galleryItems.$inferSelect;

export function GalleryItemCard({ item }: { item: GalleryItem }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2">
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        <Image
          src={publicAssetUrl(item.storageKey)}
          alt={item.caption ?? ""}
          fill
          className="object-cover"
        />
        {/* Toggling Feature/Unfeature only changes this card's position on
         *  the public site (it moves featured items first) — with just a
         *  few photos that reorder can be easy to miss entirely, so this
         *  badge is the actual visible confirmation the toggle did
         *  something. */}
        {item.featured ? (
          <Badge className="absolute top-1.5 left-1.5 shadow">Featured</Badge>
        ) : null}
        {item.hidden ? (
          <Badge variant="secondary" className="absolute top-1.5 right-1.5 shadow">
            Hidden
          </Badge>
        ) : null}
      </div>
      {item.caption ? (
        <p className="truncate text-xs text-muted-foreground">{item.caption}</p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setGalleryItemFeaturedAction(item.id, !item.featured);
              router.refresh();
            })
          }
        >
          {item.featured ? "Unfeature" : "Feature"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setGalleryItemHiddenAction(item.id, !item.hidden);
              router.refresh();
            })
          }
        >
          {item.hidden ? "Show" : "Hide"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          Delete
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the photo from storage and the public gallery. This cannot be
              undone — use Hide instead if you just want it off the site for now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteGalleryItemAction(item.id);
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
