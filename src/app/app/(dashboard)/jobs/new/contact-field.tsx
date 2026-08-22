"use client";

import { useEffect, useState } from "react";
import { searchContactsAction, type ContactSearchResult } from "@/lib/crm/contact-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The job form's contact field is more capable than the generic
// EntityPicker used by leads/properties: per
// docs/PROJECT_SPEC.md §8.1 ("at the bottom of the job form, provide an
// option to create/add the contact during submission"), it must support
// creating a brand-new contact inline, not just searching existing ones.
export function ContactField({ initial }: { initial?: { id: string; label: string } | null }) {
  const [mode, setMode] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(initial ?? null);

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => {
      searchContactsAction(query).then(setResults);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const visibleResults = query.trim() ? results : [];

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>Contact</Label>
        <input type="hidden" name="contactId" value={selected.id} />
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <span>{selected.label}</span>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-muted-foreground hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="flex flex-col gap-2 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <Label>New contact</Label>
          <button
            type="button"
            onClick={() => setMode("search")}
            className="text-xs text-muted-foreground hover:underline"
          >
            Search existing instead
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newContactDisplayName" className="text-xs">
            Name
          </Label>
          <Input id="newContactDisplayName" name="newContactDisplayName" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newContactPhone" className="text-xs">
            Phone (optional)
          </Label>
          <Input id="newContactPhone" name="newContactPhone" type="tel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="newContactEmail" className="text-xs">
            Email (optional)
          </Label>
          <Input id="newContactEmail" name="newContactEmail" type="email" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor="contact-search">Contact (optional)</Label>
        <button
          type="button"
          onClick={() => setMode("create")}
          className="text-xs text-muted-foreground hover:underline"
        >
          + New contact instead
        </button>
      </div>
      <input type="hidden" name="contactId" value="" />
      <Input
        id="contact-search"
        placeholder="Search contacts…"
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
                className="h-auto w-full justify-start px-3 py-2 font-normal"
                onClick={() => {
                  setSelected({ id: r.id, label: r.displayName });
                  setQuery("");
                  setResults([]);
                }}
              >
                {r.displayName}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
