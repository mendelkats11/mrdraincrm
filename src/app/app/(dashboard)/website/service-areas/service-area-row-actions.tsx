"use client";

import { type ChangeEvent, type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  removeServiceAreaImageAction,
  setServiceAreaActiveAction,
  updateServiceAreaAction,
  uploadServiceAreaImageAction,
} from "@/lib/website/service-area-website-actions";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { ToggleActionButton } from "@/components/website/toggle-action-button";
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
import type { serviceAreas } from "@/lib/db/schema";

type ServiceArea = typeof serviceAreas.$inferSelect;

export function ServiceAreaRowActions({ area }: { area: ServiceArea }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [imagePending, startImageTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateServiceAreaAction(undefined, formData);
      if (result?.ok) {
        setOpen(false);
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("areaId", area.id);
    formData.set("image", file);
    startImageTransition(async () => {
      await uploadServiceAreaImageAction(undefined, formData);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <ToggleActionButton
        active={area.active}
        labelOn="Hide"
        labelOff="Activate"
        action={() => setServiceAreaActiveAction(area.id, !area.active)}
      />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit service area</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Images</Label>
              <div className="flex flex-wrap gap-2">
                {area.images.map((key) => (
                  <div key={key} className="group relative">
                    <Image
                      src={publicAssetUrl(key)}
                      alt=""
                      width={64}
                      height={64}
                      className="size-16 rounded-lg border object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 hidden size-5 items-center justify-center rounded-full bg-destructive text-xs text-white group-hover:flex"
                      aria-label="Remove image"
                      onClick={() =>
                        startImageTransition(async () => {
                          await removeServiceAreaImageAction(area.id, key);
                          router.refresh();
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={imagePending}
                onChange={handleImageChange}
              />
              {imagePending ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="areaId" value={area.id} />
              <input type="hidden" name="active" value={area.active ? "on" : ""} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={area.name} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="copy">Area description</Label>
                <Textarea id="copy" name="copy" rows={4} defaultValue={area.copy ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="callrailTrackingNumber">Call Now number (optional)</Label>
                <Input
                  id="callrailTrackingNumber"
                  name="callrailTrackingNumber"
                  defaultValue={area.callrailTrackingNumber ?? ""}
                  placeholder="Uses the site default if left blank"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seoTitle">SEO title (optional)</Label>
                <Input id="seoTitle" name="seoTitle" defaultValue={area.seoTitle ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="metaDescription">Meta description (optional)</Label>
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  rows={2}
                  defaultValue={area.metaDescription ?? ""}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
