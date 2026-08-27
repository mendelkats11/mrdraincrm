"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const GENERIC_ERROR = "Something went wrong. Please try again or call us directly.";

export function ContactForm({ serviceAreas }: { serviceAreas: { id: string; name: string }[] }) {
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [serviceAreaId, setServiceAreaId] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (serviceAreas.length > 0 && !serviceAreaId) {
      setError("Please select your service area.");
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("name"),
            phone: formData.get("phone"),
            email: formData.get("email"),
            serviceAreaId: serviceAreaId || undefined,
            issueDescription: formData.get("issueDescription"),
            emergency: formData.get("emergency") === "on",
          }),
        });
        const body = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !body.ok) {
          setError(body.error ?? GENERIC_ERROR);
          return;
        }
        setStatus("sent");
      } catch {
        setError(GENERIC_ERROR);
      }
    });
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="font-medium text-foreground">Thanks — we got your request.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll be in touch shortly. For urgent issues, please call us directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" required autoComplete="tel" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {serviceAreas.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceArea">Service area</Label>
          <Select value={serviceAreaId} onValueChange={setServiceAreaId} required>
            <SelectTrigger id="serviceArea">
              <SelectValue placeholder="Select your area" />
            </SelectTrigger>
            <SelectContent>
              {serviceAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="issueDescription">Issue</Label>
        <Textarea id="issueDescription" name="issueDescription" rows={3} required />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="emergency" name="emergency" />
        <Label htmlFor="emergency" className="font-normal">
          This is an emergency
        </Label>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
