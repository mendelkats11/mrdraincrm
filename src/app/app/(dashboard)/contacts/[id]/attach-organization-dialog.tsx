"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  attachContactToOrganizationAction,
  type OrganizationSearchResult,
  searchOrganizationsAction,
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
import { Label } from "@/components/ui/label";

export function AttachOrganizationDialog({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrganizationSearchResult[]>([]);
  const [selected, setSelected] = useState<OrganizationSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => searchOrganizationsAction(query).then(setResults), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const visibleResults = query.trim() ? results : [];

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await attachContactToOrganizationAction(undefined, formData);
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
        <Button variant="outline" size="sm">
          + Add organization
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to an organization</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="contactId" value={contactId} />
          {selected ? <input type="hidden" name="organizationId" value={selected.id} /> : null}

          {!selected ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-search">Organization</Label>
              <Input
                id="org-search"
                autoFocus
                placeholder="Search organizations…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul className="flex flex-col gap-1">
                {visibleResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {r.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{selected.name}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-muted-foreground hover:underline"
              >
                Change
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" name="title" placeholder="e.g. Property Manager" />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending || !selected}>
              {pending ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
