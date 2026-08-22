"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PickerOption {
  id: string;
  label: string;
}

/**
 * Generic optional search-and-select field shared by the New/Edit Lead and
 * New/Edit Job forms for contact/property — mirrors the search-then-pick
 * pattern established in contacts' attach-*-dialog components (Phase 3),
 * reusable across entity types via the `search` prop instead of being
 * duplicated per entity.
 */
export function EntityPicker({
  name,
  label,
  placeholder,
  search,
  initial,
  onSelect,
}: {
  name: string;
  label: string;
  placeholder: string;
  search: (query: string) => Promise<PickerOption[]>;
  initial?: PickerOption | null;
  /** Optional — lets a form prefill other fields (e.g. customer name/
   *  address) from the picked entity. Called with null when cleared. */
  onSelect?: (option: PickerOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerOption[]>([]);
  const [selected, setSelected] = useState<PickerOption | null>(initial ?? null);

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(() => search(query).then(setResults), 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const visibleResults = query.trim() ? results : [];

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {selected ? (
        <input type="hidden" name={name} value={selected.id} />
      ) : (
        <input type="hidden" name={name} value="" />
      )}
      {selected ? (
        <div className="flex items-center justify-between rounded-md border p-2 text-sm">
          <span>{selected.label}</span>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              onSelect?.(null);
            }}
            className="text-xs text-muted-foreground hover:underline"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {visibleResults.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {visibleResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(r);
                      setQuery("");
                      setResults([]);
                      onSelect?.(r);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
