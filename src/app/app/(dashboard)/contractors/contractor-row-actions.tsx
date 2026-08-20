"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { setContractorActiveAction } from "@/lib/contractors/contractor-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ContractorRowActions({
  contractorId,
  active,
}: {
  contractorId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Contractor actions" disabled={pending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => router.push(`/contractors/${contractorId}`)}>
          View
        </DropdownMenuItem>
        <DropdownMenuItem
          variant={active ? "destructive" : undefined}
          onSelect={() =>
            startTransition(async () => {
              await setContractorActiveAction(contractorId, !active);
              router.refresh();
            })
          }
        >
          {active ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
