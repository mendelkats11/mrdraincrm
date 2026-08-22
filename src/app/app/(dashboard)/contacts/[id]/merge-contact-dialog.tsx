"use client";

import { type ReactNode, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type ContactSearchResult,
  mergeContactsAction,
  searchContactsForMergeAction,
} from "@/lib/crm/contact-actions";
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

export function MergeContactDialog({
  contact,
  initialTarget,
  trigger,
}: {
  contact: { id: string; displayName: string };
  /** Skips the search step, e.g. when opened from a duplicate suggestion. */
  initialTarget?: ContactSearchResult;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [target, setTarget] = useState<ContactSearchResult | null>(initialTarget ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Legitimate debounced-fetch effect (subscribes to `query` changing) —
  // deliberately does not setState synchronously as its first statement;
  // the empty-query case is handled at render time (see `visibleResults`
  // below) rather than by eagerly clearing `results` here.
  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => {
      searchContactsForMergeAction(query, contact.id).then(setResults);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, contact.id]);

  const visibleResults = query.trim() ? results : [];

  function reset() {
    setQuery("");
    setResults([]);
    setTarget(initialTarget ?? null);
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await mergeContactsAction(undefined, formData);
      if (result?.ok) {
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Merge duplicate…</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge a duplicate into {contact.displayName}</DialogTitle>
        </DialogHeader>

        {!target ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Find the duplicate contact to merge into <strong>{contact.displayName}</strong>. The
              duplicate will be archived, not deleted.
            </p>
            <Input
              autoFocus
              placeholder="Search by name, phone, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="flex flex-col gap-1">
              {visibleResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setTarget(r)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {r.displayName}
                  </button>
                </li>
              ))}
              {query.trim() && visibleResults.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">No matching contacts.</li>
              ) : null}
            </ul>
          </div>
        ) : (
          <form action={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="keepContactId" value={contact.id} />
            <input type="hidden" name="archiveContactId" value={target.id} />

            <div className="rounded-md border p-3 text-sm">
              <p>
                <span className="font-medium text-success">Keep:</span> {contact.displayName}
              </p>
              <p className="mt-1">
                <span className="font-medium text-destructive">Archive:</span> {target.displayName}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {target.displayName}&apos;s phones, emails, and properties move to{" "}
                {contact.displayName}. {target.displayName} is archived, not deleted, and its
                history is preserved.
              </p>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setTarget(null)}>
                Back
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Merging…" : `Merge into ${contact.displayName}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
