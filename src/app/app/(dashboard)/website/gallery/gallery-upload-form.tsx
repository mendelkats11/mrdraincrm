"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadGalleryItemAction } from "@/lib/website/gallery-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "none";

export function GalleryUploadForm({
  services,
  serviceAreas,
}: {
  services: { id: string; name: string }[];
  serviceAreas: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    if (formData.get("serviceId") === NONE) formData.delete("serviceId");
    if (formData.get("serviceAreaId") === NONE) formData.delete("serviceAreaId");
    startTransition(async () => {
      const result = await uploadGalleryItemAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gallery-file" className="text-xs">
          Photo
        </Label>
        <Input
          id="gallery-file"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gallery-caption" className="text-xs">
          Caption (optional)
        </Label>
        <Input id="gallery-caption" name="caption" className="w-40" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="gallery-before-after" className="text-xs">
          Before/after
        </Label>
        <Select name="beforeAfter" defaultValue="na">
          <SelectTrigger id="gallery-before-after" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="na">N/A</SelectItem>
            <SelectItem value="before">Before</SelectItem>
            <SelectItem value="after">After</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {services.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gallery-service" className="text-xs">
            Service (optional)
          </Label>
          <Select name="serviceId" defaultValue={NONE}>
            <SelectTrigger id="gallery-service" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      {serviceAreas.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gallery-area" className="text-xs">
            Service area (optional)
          </Label>
          <Select name="serviceAreaId" defaultValue={NONE}>
            <SelectTrigger id="gallery-area" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {serviceAreas.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
