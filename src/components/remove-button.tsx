"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Generic detach/remove action button — used across contacts/properties. */
export function RemoveButton({
  onRemove,
  label,
}: {
  onRemove: () => Promise<void>;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6"
      aria-label={label}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await onRemove();
          router.refresh();
        })
      }
    >
      <X className="size-3.5" />
    </Button>
  );
}
