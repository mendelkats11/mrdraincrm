"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadInvoiceLogoAction,
  updateInvoiceTemplateAction,
} from "@/lib/invoices/invoice-actions";
import { ACCENT_COLOR_OPTIONS, FONT_FAMILY_OPTIONS } from "@/lib/pdf/invoice-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InvoiceSettingsForm({
  logoUrl,
  accentColor,
  fontFamily,
}: {
  logoUrl: string | null;
  accentColor: string;
  fontFamily: string;
}) {
  const router = useRouter();

  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoPending, startLogoTransition] = useTransition();
  const logoFormRef = useRef<HTMLFormElement>(null);

  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templatePending, startTemplateTransition] = useTransition();

  function handleLogoSubmit(formData: FormData) {
    startLogoTransition(async () => {
      const result = await uploadInvoiceLogoAction(undefined, formData);
      if (result?.ok) {
        setLogoError(null);
        logoFormRef.current?.reset();
        router.refresh();
      } else {
        setLogoError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleTemplateSubmit(formData: FormData) {
    startTemplateTransition(async () => {
      const result = await updateInvoiceTemplateAction(undefined, formData);
      if (result?.ok) {
        setTemplateError(null);
        router.refresh();
      } else {
        setTemplateError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Label>Logo</Label>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 signed URL, same pattern as photo-card.tsx
          <img
            src={logoUrl}
            alt="Current invoice logo"
            width={160}
            height={70}
            className="rounded-md border bg-muted object-contain p-2"
          />
        ) : (
          <p className="text-sm text-muted-foreground">No logo uploaded yet.</p>
        )}
        <form
          ref={logoFormRef}
          action={handleLogoSubmit}
          className="flex flex-wrap items-end gap-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logo-file" className="text-xs">
              Upload a new logo
            </Label>
            <Input
              id="logo-file"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={logoPending}>
            {logoPending ? "Uploading…" : "Upload"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP. Max 2 MB.</p>
        {logoError ? (
          <p role="alert" className="text-sm text-destructive">
            {logoError}
          </p>
        ) : null}
      </div>

      <form action={handleTemplateSubmit} className="flex flex-col gap-4 border-t pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accentColor">Accent color</Label>
            <Select name="accentColor" defaultValue={accentColor}>
              <SelectTrigger id="accentColor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCENT_COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fontFamily">Font</Label>
            <Select name="fontFamily" defaultValue={fontFamily}>
              <SelectTrigger id="fontFamily">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILY_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {templateError ? (
          <p role="alert" className="text-sm text-destructive">
            {templateError}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={templatePending}>
            {templatePending ? "Saving…" : "Save defaults"}
          </Button>
        </div>
      </form>
    </div>
  );
}
