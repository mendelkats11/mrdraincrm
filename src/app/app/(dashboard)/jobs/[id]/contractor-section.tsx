"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignContractorAction,
  checkContractorConflictAction,
  createContractorAction,
  searchContractorsAction,
  unassignContractorAction,
  type ContractorSearchResult,
} from "@/lib/contractors/contractor-actions";
import { formatPhoneForDisplay } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface CurrentAssignmentInfo {
  contractorId: string;
  contractorName: string;
  contractorPhone: string | null;
  contractorEmail: string | null;
}

export interface AssignmentHistoryInfo {
  id: string;
  contractorName: string;
  status: string;
  assignedAt: Date;
}

const HISTORY_DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ContractorSection({
  jobId,
  current,
  history,
}: {
  jobId: string;
  current: CurrentAssignmentInfo | null;
  history: AssignmentHistoryInfo[];
}) {
  const [mode, setMode] = useState<"idle" | "search" | "create">("idle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContractorSearchResult[]>([]);
  const [pendingContractor, setPendingContractor] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [conflict, setConflict] = useState<{ jobNumber: string; scheduleSummary: string } | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => searchContractorsAction(query).then(setResults), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const visibleResults = query.trim() ? results : [];

  function reset() {
    setMode("idle");
    setQuery("");
    setResults([]);
    setError(null);
  }

  function handlePickExisting(contractorId: string, contractorName: string) {
    startTransition(async () => {
      setError(null);
      const conflictResult = await checkContractorConflictAction(jobId, contractorId);
      if (conflictResult) {
        setPendingContractor({ id: contractorId, name: contractorName });
        setConflict(conflictResult);
        setConfirmOpen(true);
        return;
      }
      await assignContractorAction(jobId, contractorId);
      reset();
      router.refresh();
    });
  }

  function handleCreateSubmit(formData: FormData) {
    startTransition(async () => {
      const created = await createContractorAction(undefined, formData);
      if (!created?.ok) {
        setError(created?.error ?? "Something went wrong.");
        return;
      }
      setError(null);
      const conflictResult = await checkContractorConflictAction(jobId, created.contractorId);
      if (conflictResult) {
        setPendingContractor({ id: created.contractorId, name: created.contractorName });
        setConflict(conflictResult);
        setConfirmOpen(true);
        return;
      }
      await assignContractorAction(jobId, created.contractorId);
      reset();
      router.refresh();
    });
  }

  function handleConfirmAssignAnyway() {
    if (!pendingContractor) return;
    startTransition(async () => {
      await assignContractorAction(jobId, pendingContractor.id);
      setConfirmOpen(false);
      setPendingContractor(null);
      setConflict(null);
      reset();
      router.refresh();
    });
  }

  function handleCancelConflict() {
    setConfirmOpen(false);
    setPendingContractor(null);
    setConflict(null);
  }

  function handleUnassign() {
    startTransition(async () => {
      await unassignContractorAction(jobId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {current ? (
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <div>
            <p className="font-medium">{current.contractorName}</p>
            {current.contractorPhone ? (
              <p className="text-muted-foreground">
                {formatPhoneForDisplay(current.contractorPhone)}
              </p>
            ) : null}
            {current.contractorEmail ? (
              <p className="text-muted-foreground">{current.contractorEmail}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleUnassign}
          >
            Unassign
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No contractor assigned.</p>
      )}

      {mode === "idle" ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setMode("search")}>
          {current ? "Reassign" : "Assign contractor"}
        </Button>
      ) : null}

      {mode === "search" ? (
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Search contractors</Label>
            <button
              type="button"
              onClick={() => setMode("create")}
              className="text-xs text-muted-foreground hover:underline"
            >
              + New contractor instead
            </button>
          </div>
          <Input
            autoFocus
            placeholder="Search contractors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {visibleResults.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {visibleResults.map((r) => (
                <li key={r.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    className="h-auto w-full justify-start px-3 py-2 font-normal"
                    onClick={() => handlePickExisting(r.id, r.name)}
                  >
                    {r.name}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            Cancel
          </Button>
        </div>
      ) : null}

      {mode === "create" ? (
        <form action={handleCreateSubmit} className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">New contractor</Label>
            <button
              type="button"
              onClick={() => setMode("search")}
              className="text-xs text-muted-foreground hover:underline"
            >
              Search existing instead
            </button>
          </div>
          <Input name="name" placeholder="Name" required autoFocus />
          <Input name="phone" type="tel" placeholder="Phone (optional)" />
          <Input name="email" type="email" placeholder="Email (optional)" />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Creating…" : "Create & assign"}
          </Button>
        </form>
      ) : null}

      {history.length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">Assignment history</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {history.map((h) => (
              <li key={h.id} className="text-xs text-muted-foreground">
                {h.contractorName} — {h.status} ({HISTORY_DATE_FMT.format(h.assignedAt)})
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && handleCancelConflict()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scheduling conflict</AlertDialogTitle>
            <AlertDialogDescription>
              ⚠️ {pendingContractor?.name} is already scheduled for job {conflict?.jobNumber} from{" "}
              {conflict?.scheduleSummary} — you can still assign them to this job too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConflict}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={handleConfirmAssignAnyway}>
              Assign Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
