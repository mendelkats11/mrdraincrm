"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createLeadAction } from "@/lib/crm/lead-actions";
import { searchContactsAction, searchPropertiesAction } from "@/lib/crm/contact-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { EntityPicker } from "@/components/entity-picker";

export function NewLeadDialog({ services }: { services: { id: string; name: string }[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [open, setOpen] = useState(() => searchParams.get("new") === "1");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // The global "+ New" quick-actions menu (docs/PROJECT_SPEC.md §23) opens
  // this dialog from anywhere via ?new=1 rather than duplicating its form —
  // strip the param once consumed so a later refresh/back-navigation
  // doesn't keep reopening it.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      router.replace(params.toString() ? `${pathname}?${params}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createLeadAction(undefined, formData);
      if (result?.ok) {
        setOpen(false);
        setError(null);
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
        if (next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>+ New Lead</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New lead</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <EntityPicker
            name="contactId"
            label="Contact (optional)"
            placeholder="Search contacts…"
            search={async (q) =>
              (await searchContactsAction(q)).map((c) => ({ id: c.id, label: c.displayName }))
            }
          />
          <EntityPicker
            name="propertyId"
            label="Property (optional)"
            placeholder="Search properties…"
            search={async (q) =>
              (await searchPropertiesAction(q)).map((p) => ({
                id: p.id,
                label: `${p.addressLine1}, ${p.city}`,
              }))
            }
          />
          {services.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceId">Service (optional)</Label>
              <Select name="serviceId">
                <SelectTrigger id="serviceId">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issueDescription">Issue</Label>
            <Textarea id="issueDescription" name="issueDescription" rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="emergency" name="emergency" />
            <Label htmlFor="emergency" className="font-normal">
              Emergency
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Source</Label>
              <Input id="source" name="source" placeholder="e.g. phone, referral" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sourceDetails">Source details</Label>
              <Input id="sourceDetails" name="sourceDetails" />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
