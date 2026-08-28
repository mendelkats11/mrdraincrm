"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateWebsiteSettingsAction } from "@/lib/website/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { WebsiteSettings } from "@/lib/website/settings";

export function WebsiteSettingsForm({ settings }: { settings: WebsiteSettings }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateWebsiteSettingsAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessName">Business name</Label>
        <Input id="businessName" name="businessName" defaultValue={settings.businessName ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="businessAddress">Business address</Label>
        <Textarea
          id="businessAddress"
          name="businessAddress"
          rows={2}
          defaultValue={settings.businessAddress ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tagline">Homepage tagline</Label>
        <Input
          id="tagline"
          name="tagline"
          defaultValue={settings.tagline ?? ""}
          placeholder="e.g. Saskatoon's trusted plumbing experts"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="footerTagline">Footer tagline</Label>
        <Input
          id="footerTagline"
          name="footerTagline"
          defaultValue={settings.footerTagline ?? ""}
          placeholder="e.g. local, reliable plumbing"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="publicContactEmail">Public contact email</Label>
        <Input
          id="publicContactEmail"
          name="publicContactEmail"
          type="email"
          defaultValue={settings.publicContactEmail ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultCallrailTrackingNumber">Default Call Now number</Label>
        <Input
          id="defaultCallrailTrackingNumber"
          name="defaultCallrailTrackingNumber"
          defaultValue={settings.defaultCallrailTrackingNumber ?? ""}
          placeholder="Used on pages without a more specific service-area number"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="reviewsPageEnabled"
          defaultChecked={settings.reviewsPageEnabled}
        />
        Show the standalone Reviews page (/reviews)
      </label>
      <div className="flex flex-col gap-1.5 border-t pt-4">
        <Label htmlFor="aboutHeading">About page heading</Label>
        <Input id="aboutHeading" name="aboutHeading" defaultValue={settings.aboutHeading ?? ""} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="aboutBody">About page body</Label>
        <Textarea
          id="aboutBody"
          name="aboutBody"
          rows={6}
          defaultValue={settings.aboutBody ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5 border-t pt-4">
        <Label htmlFor="termsOfServiceContent">Terms of Service (/terms)</Label>
        <p className="text-xs text-muted-foreground">
          Placeholder content only — have this reviewed before relying on it as real legal text.
        </p>
        <Textarea
          id="termsOfServiceContent"
          name="termsOfServiceContent"
          rows={8}
          defaultValue={settings.termsOfServiceContent ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="privacyPolicyContent">Privacy Policy (/privacy)</Label>
        <p className="text-xs text-muted-foreground">
          Placeholder content only — have this reviewed before relying on it as real legal text.
        </p>
        <Textarea
          id="privacyPolicyContent"
          name="privacyPolicyContent"
          rows={8}
          defaultValue={settings.privacyPolicyContent ?? ""}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
