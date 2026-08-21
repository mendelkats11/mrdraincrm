"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Image from "next/image";
import {
  deleteGalleryItemAction,
  setGalleryItemFeaturedAction,
  setGalleryItemHiddenAction,
} from "@/lib/website/gallery-actions";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { Button } from "@/components/ui/button";
import type { galleryItems } from "@/lib/db/schema";

type GalleryItem = typeof galleryItems.$inferSelect;

export function GalleryItemCard({ item }: { item: GalleryItem }) {
  const router = useRouter();
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
          onClick={() =>
            startTransition(async () => {
              await deleteGalleryItemAction(item.id);
              router.refresh();
            })
          }
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
