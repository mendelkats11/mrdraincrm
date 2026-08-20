"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateServiceAreaTrackingNumberAction } from "@/lib/callrail/service-area-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TrackingNumberRow({
  serviceAreaId,
  name,
  trackingNumber,
}: {
  serviceAreaId: string;
  name: string;
  trackingNumber: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateServiceAreaTrackingNumberAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 rounded-lg border p-3">
      <input type="hidden" name="serviceAreaId" value={serviceAreaId} />
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground">{name}</Label>
        <Input
          name="trackingNumber"
          defaultValue={trackingNumber ?? ""}
          placeholder="(306) 555-0100"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
