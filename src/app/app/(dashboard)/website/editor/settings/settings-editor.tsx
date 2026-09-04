"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/website/media-picker";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import {
  patchWebsiteSettingsFieldAction,
  setBackgroundImageAction,
  setReviewsPageEnabledAction,
  updateContactBackgroundAction,
  updateServicesBackgroundAction,
} from "@/lib/website/settings-actions";
import type { WebsiteSettings } from "@/lib/website/settings";

/**
 * Branding & Contact in the visual editor — every field saves on blur/
 * change, same as the rest of this editor; no "Save changes" button
 * anywhere on this page. Business info, homepage/footer tagline, the About
 * page, the two optional page backgrounds, and the legal pages all live
 * here now instead of the old classic settings form.
 */
export function SettingsEditor({ settings: initialSettings }: { settings: WebsiteSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [prevInitialSettings, setPrevInitialSettings] = useState(initialSettings);
  if (initialSettings !== prevInitialSettings) {
    setPrevInitialSettings(initialSettings);
    setSettings(initialSettings);
  }

  function patchLocal(patch: Partial<WebsiteSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  function field<K extends keyof WebsiteSettings>(key: K) {
    return {
      defaultValue: (settings[key] as string | null) ?? "",
      onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.currentTarget.value;
        if (value === ((settings[key] as string | null) ?? "")) return;
        patchLocal({ [key]: value || null } as Partial<WebsiteSettings>);
        void patchWebsiteSettingsFieldAction(key, value);
      },
    };
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Branding &amp; Contact</h1>
        <p className="text-sm text-muted-foreground">
          Every field here saves as soon as you click away — there&apos;s nothing to submit.
        </p>
      </div>

      <Section title="Business info">
        <Field label="Business name">
          <Input {...field("businessName")} />
        </Field>
        <Field label="Business address">
          <Textarea rows={2} {...field("businessAddress")} />
        </Field>
        <Field label="Public contact email">
          <Input type="email" {...field("publicContactEmail")} />
        </Field>
        <Field
          label="Default Call Now number"
          hint="Used on pages without a more specific service-area number."
        >
          <Input {...field("defaultCallrailTrackingNumber")} />
        </Field>
      </Section>

      <Section title="Homepage & footer">
        <Field
          label="Homepage tagline"
          hint="Also editable directly on the homepage hero — same field."
        >
          <Input placeholder="e.g. Saskatoon's trusted plumbing experts" {...field("tagline")} />
        </Field>
        <Field label="Footer tagline">
          <Input placeholder="e.g. local, reliable plumbing" {...field("footerTagline")} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            defaultChecked={settings.reviewsPageEnabled}
            onCheckedChange={(checked) => {
              const enabled = checked === true;
              patchLocal({ reviewsPageEnabled: enabled });
              void setReviewsPageEnabledAction(enabled);
            }}
          />
          Show the standalone Reviews page (/reviews)
        </label>
      </Section>

      <Section title="About page">
        <Field label="Heading">
          <Input {...field("aboutHeading")} />
        </Field>
        <Field label="Body">
          <Textarea rows={6} {...field("aboutBody")} />
        </Field>
      </Section>

      <Section title="Page backgrounds">
        <BackgroundPicker
          label="Contact page background"
          imageUrl={
            settings.contactBackgroundImageKey
              ? publicAssetUrl(settings.contactBackgroundImageKey)
              : null
          }
          field="contactBackgroundImageKey"
          removeAction={updateContactBackgroundAction}
        />
        <BackgroundPicker
          label="Services page background"
          imageUrl={
            settings.servicesBackgroundImageKey
              ? publicAssetUrl(settings.servicesBackgroundImageKey)
              : null
          }
          field="servicesBackgroundImageKey"
          removeAction={updateServicesBackgroundAction}
        />
      </Section>

      <Section
        title="Legal pages"
        hint="Placeholder content only — have this reviewed before relying on it as real legal text."
      >
        <Field label="Terms of Service (/terms)">
          <Textarea rows={8} {...field("termsOfServiceContent")} />
        </Field>
        <Field label="Privacy Policy (/privacy)">
          <Textarea rows={8} {...field("privacyPolicyContent")} />
        </Field>
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

function BackgroundPicker({
  label,
  imageUrl,
  field,
  removeAction,
}: {
  label: string;
  imageUrl: string | null;
  field: "contactBackgroundImageKey" | "servicesBackgroundImageKey";
  removeAction: (
    prevState: { ok: true } | { ok: false; error: string } | undefined,
    formData: FormData,
  ) => Promise<{ ok: true } | { ok: false; error: string } | undefined>;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  function handleSelect(key: string) {
    setPending(true);
    void setBackgroundImageAction(field, key).finally(() => {
      setPending(false);
      router.refresh();
    });
  }

  function handleRemove() {
    setPending(true);
    const formData = new FormData();
    formData.set("remove", "on");
    void removeAction(undefined, formData).finally(() => {
      setPending(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public asset, same pattern as elsewhere in this editor
        <img
          src={imageUrl}
          alt=""
          className="h-28 w-full max-w-xs rounded-md border object-cover"
        />
      ) : (
        <p className="text-sm text-muted-foreground">No background set — plain background.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <MediaPicker
          triggerLabel={imageUrl ? "Replace image" : "Choose image"}
          onSelect={handleSelect}
        />
        {imageUrl ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleRemove}
          >
            Remove
          </Button>
        ) : null}
        {pending ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
      </div>
    </div>
  );
}
