"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  attachContactToPropertyAction,
  type ContactSearchResult,
  searchContactsAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLES = [
  { value: "primary_contact", label: "Primary Contact" },
  { value: "owner", label: "Owner" },
  { value: "tenant", label: "Tenant" },
  { value: "property_manager", label: "Property Manager" },
  { value: "spouse_family", label: "Spouse/Family" },
  { value: "business_contact", label: "Business Contact" },
  { value: "other", label: "Other" },
] as const;

export function AttachContactDialog({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [selected, setSelected] = useState<ContactSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => searchContactsAction(query).then(setResults), 250);
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
      const result = await attachContactToPropertyAction(undefined, formData);
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
          + Add contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link a contact</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="propertyId" value={propertyId} />
          {selected ? <input type="hidden" name="contactId" value={selected.id} /> : null}

          {!selected ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-search">Contact</Label>
              <Input
                id="contact-search"
                autoFocus
                placeholder="Search contacts…"
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
                      {r.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{selected.displayName}</span>
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
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue="primary_contact">
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
