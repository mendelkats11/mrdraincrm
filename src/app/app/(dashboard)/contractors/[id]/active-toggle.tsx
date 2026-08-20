"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setContractorActiveAction } from "@/lib/contractors/contractor-actions";
import { Button } from "@/components/ui/button";

// Unlike Contacts' archive/restore, deactivating a contractor never hides
// their data — it only stops them appearing in the assignment picker for
// *new* jobs (searchContractors already filters WHERE active = true). It's
// fully reversible and doesn't affect anything already recorded, so this
// doesn't need an AlertDialog confirmation step the way Archive does.
export function ActiveToggle({ contractorId, active }: { contractorId: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setContractorActiveAction(contractorId, !active);
          router.refresh();
        })
      }
    >
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
