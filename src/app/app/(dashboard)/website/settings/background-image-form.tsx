"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BackgroundImageFormState } from "@/lib/website/settings-actions";
import { setBackgroundImageAction } from "@/lib/website/settings-actions";
import { MediaPicker } from "@/components/website/media-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** One reusable picker for a single optional full-bleed background photo —
 *  shared by the Contact and Services page background settings. Website
 *  editor overhaul, phase 2: was its own raw file upload; now shares the
 *  same MediaPicker every other image field in the CMS uses. */
export function BackgroundImageForm({
  label,
  imageUrl,
  field,
  removeAction,
}: {
  label: string;
  imageUrl: string | null;
  field: "contactBackgroundImageKey" | "servicesBackgroundImageKey";
  removeAction: (
    prevState: BackgroundImageFormState,
    formData: FormData,
  ) => Promise<BackgroundImageFormState>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSelect(key: string) {
    setError(null);
    startTransition(async () => {
      const result = await setBackgroundImageAction(field, key);
      if (result?.ok) {
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("remove", "on");
      const result = await removeAction(undefined, formData);
      if (result?.ok) {
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>{label}</Label>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public asset, same pattern as invoice-settings-form.tsx
        <img
          src={imageUrl}
          alt=""
          className="h-28 w-full max-w-xs rounded-md border object-cover"
        />
      ) : (
        <p className="text-sm text-muted-foreground">No background set — plain background.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <MediaPicker
          triggerLabel={imageUrl ? "Replace image" : "Choose image"}
          onSelect={handleSelect}
        />
        {imageUrl ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleRemove}
          >
            Remove
          </Button>
        ) : null}
        {pending ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
