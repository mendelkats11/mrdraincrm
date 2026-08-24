"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContactFromCallAction, createLeadFromCallAction } from "@/lib/callrail/call-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// docs/PROJECT_SPEC.md §16.2 — unknown callers never automatically become
// contacts; these are the three explicit owner-driven actions.
export function UnknownCallerActions({
  callId,
  suggestedName,
}: {
  callId: string;
  suggestedName: string;
}) {
  const [mode, setMode] = useState<"idle" | "contact" | "lead">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createContactFromCallAction(undefined, formData);
      if (result?.ok) {
        router.push(`/contacts/${result.contactId}`);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createLeadFromCallAction(undefined, formData);
      if (result?.ok) {
        router.push(`/leads/${result.leadId}`);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Unknown caller</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mode === "idle" ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setMode("contact")}>
              Create Contact
            </Button>
            <Button type="button" variant="outline" onClick={() => setMode("lead")}>
              Create Lead
            </Button>
          </div>
        ) : null}

        {mode === "contact" ? (
          <form onSubmit={handleCreateContact} className="flex flex-col gap-3">
            <input type="hidden" name="callId" value={callId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={suggestedName}
                required
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create Contact"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {mode === "lead" ? (
          <form onSubmit={handleCreateLead} className="flex flex-col gap-3">
            <input type="hidden" name="callId" value={callId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leadDisplayName">Name</Label>
              <Input
                id="leadDisplayName"
                name="displayName"
                defaultValue={suggestedName}
                required
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issueDescription">Issue / work description</Label>
              <Textarea id="issueDescription" name="issueDescription" rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="emergency" name="emergency" />
              <Label htmlFor="emergency" className="font-normal">
                Emergency
              </Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create Lead"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
