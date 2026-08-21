"use client";

import { type ChangeEvent, type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  setServiceActiveAction,
  updateServiceAction,
  uploadServiceImageAction,
} from "@/lib/website/service-actions";
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
import type { services } from "@/lib/db/schema";

type Service = typeof services.$inferSelect;

export function ServiceRowActions({ service }: { service: Service }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [imagePending, startImageTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateServiceAction(undefined, formData);
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
    formData.set("serviceId", service.id);
    formData.set("image", file);
    startImageTransition(async () => {
      await uploadServiceImageAction(undefined, formData);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <ToggleActionButton
        active={service.active}
        labelOn="Hide"
        labelOff="Activate"
        action={() => setServiceActiveAction(service.id, !service.active)}
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
            <DialogTitle>Edit service</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {service.imageKey ? (
                <Image
                  src={publicAssetUrl(service.imageKey)}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Label htmlFor="service-image" className="text-xs">
                  {imagePending ? "Uploading…" : "Replace image"}
                </Label>
                <Input
                  id="service-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={imagePending}
                  onChange={handleImageChange}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="serviceId" value={service.id} />
              <input type="hidden" name="active" value={service.active ? "on" : ""} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={service.name} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={service.description ?? ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seoTitle">SEO title (optional)</Label>
                <Input id="seoTitle" name="seoTitle" defaultValue={service.seoTitle ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="metaDescription">Meta description (optional)</Label>
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  rows={2}
                  defaultValue={service.metaDescription ?? ""}
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
