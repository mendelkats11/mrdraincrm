"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BackgroundImageFormState } from "@/lib/website/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** One reusable uploader for a single optional full-bleed background photo
 *  — shared by the Contact and Services page background settings, same
 *  upload-or-remove shape as invoice-settings-form.tsx's logo. Two
 *  separate forms (upload vs. remove) rather than one form with two submit
 *  behaviors, so each stays a plain, unambiguous FormData submission. */
export function BackgroundImageForm({
  label,
  imageUrl,
  action,
}: {
  label: string;
  imageUrl: string | null;
  action: (
    prevState: BackgroundImageFormState,
    formData: FormData,
  ) => Promise<BackgroundImageFormState>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const uploadFormRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await action(undefined, formData);
      if (result?.ok) {
        setError(null);
        uploadFormRef.current?.reset();
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
      <div className="flex flex-wrap items-end gap-2">
        <form ref={uploadFormRef} action={submit} className="flex flex-wrap items-end gap-2">
          <Input name="image" type="file" accept="image/png,image/jpeg,image/webp" />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Upload"}
          </Button>
        </form>
        {imageUrl ? (
          <form action={submit}>
            <input type="hidden" name="remove" value="on" />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Remove
            </Button>
          </form>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
