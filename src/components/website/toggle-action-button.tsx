"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/** Shared by every Website CMS boolean toggle (service/service-area
 *  active, gallery item featured/hidden) — same reversible, no-
 *  confirmation-needed pattern already established for contractor
 *  active/inactive (src/app/app/(dashboard)/contractors/[id]/active-toggle.tsx). */
export function ToggleActionButton({
  active,
  labelOn,
  labelOff,
  action,
  size = "sm",
}: {
  active: boolean;
  labelOn: string;
  labelOff: string;
  action: () => Promise<void>;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await action();
          router.refresh();
        })
      }
    >
      {active ? labelOn : labelOff}
    </Button>
  );
}
