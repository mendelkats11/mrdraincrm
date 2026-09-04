"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Plus, Wrench, X } from "lucide-react";
import { EditableText } from "@/components/site/editable-text";
import { MediaPicker } from "@/components/website/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import {
  createServiceAction,
  patchServiceFieldAction,
  setServiceActiveAction,
  setServiceImageAction,
} from "@/lib/website/service-actions";
import type { services } from "@/lib/db/schema";
import type { ServiceFaq } from "@/lib/website/services";

type Service = typeof services.$inferSelect;

/**
 * The Services page in the visual editor. Name and short description are
 * click-to-edit right on the card, same as everything else this editor
 * covers; content/FAQs/SEO fields — the ones that were never going to be a
 * single line of text — live behind a "Details" toggle instead of a modal,
 * reusing the same updateServiceAction the old dialog used.
 */
export function ServicesEditor({ services: initialServices }: { services: Service[] }) {
  const [services, setServices] = useState(initialServices);
  // Resyncs after router.refresh() (new-service creation, or the Details
  // form's save) re-runs the server component with fresh rows — this
  // client component stays mounted across that refresh, so its own
  // useState wouldn't otherwise pick up the change. Same "adjust state
  // during render" pattern as the homepage editor, for the same reason:
  // cheaper than an effect, and inline edits never hit this path since they
  // update local state directly without a refresh.
  const [prevInitialServices, setPrevInitialServices] = useState(initialServices);
  if (initialServices !== prevInitialServices) {
    setPrevInitialServices(initialServices);
    setServices(initialServices);
  }
  const [adding, setAdding] = useState(false);

  function patchLocal(id: string, patch: Partial<Service>) {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground">
            Click a name or description to edit it directly. Hidden services still have their own
            page but won&apos;t appear in the site&apos;s services list.
          </p>
        </div>
        {!adding ? (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add service
          </Button>
        ) : null}
      </div>

      {adding ? <NewServiceForm onCancel={() => setAdding(false)} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onPatch={(patch) => patchLocal(service.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function NewServiceForm({ onCancel }: { onCancel: () => void }) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name.trim());
      const result = await createServiceAction(undefined, formData);
      if (result?.ok) {
        // createServiceAction doesn't hand back the created row — refreshing
        // this server component is the simplest correct way to pick up its
        // real id/slug/sortOrder rather than guessing at them client-side.
        router.refresh();
        onCancel();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Service name, e.g. Water Heater Repair"
        className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={!name.trim() || pending} onClick={handleSubmit}>
          {pending ? "Creating…" : "Create"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ServiceCard({
  service,
  onPatch,
}: {
  service: Service;
  onPatch: (patch: Partial<Service>) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative h-40 w-full bg-primary/10">
        {service.imageKey ? (
          <Image src={publicAssetUrl(service.imageKey)} alt="" fill className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-primary">
            <Wrench className="size-8" aria-hidden="true" />
          </div>
        )}
        {!service.active ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Hidden
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-1.5 opacity-70 transition group-hover:opacity-100">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border bg-card/95 p-0.5 shadow-sm">
            <MediaPicker
              triggerLabel="Photo"
              onSelect={(key) => {
                onPatch({ imageKey: key });
                void setServiceImageAction(service.id, key);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={pending}
              aria-label={service.active ? "Hide" : "Show"}
              title={service.active ? "Hide from services list" : "Show on services list"}
              onClick={() => {
                setPending(true);
                onPatch({ active: !service.active });
                void setServiceActiveAction(service.id, !service.active).finally(() =>
                  setPending(false),
                );
              }}
            >
              {service.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <EditableText
          as="p"
          className="font-semibold text-brand-navy"
          value={service.name}
          onCommit={(v) => {
            onPatch({ name: v });
            void patchServiceFieldAction(service.id, { name: v });
          }}
        />
        <EditableText
          as="p"
          multiline
          className="text-sm text-foreground/70"
          value={service.description ?? ""}
          placeholder="Add a short description (shown on the services list)"
          onCommit={(v) => {
            onPatch({ description: v });
            void patchServiceFieldAction(service.id, { description: v });
          }}
        />
        <div className="mt-1 flex items-center justify-between">
          <a
            href={`/services/${service.slug}`}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            /services/{service.slug}
          </a>
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground hover:text-primary hover:underline"
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "Close" : "Details"}
          </button>
        </div>
      </div>

      {detailsOpen ? <ServiceDetailsForm service={service} /> : null}
    </div>
  );
}

/** Content / FAQs / SEO fields — each one saves on blur/change via
 *  patchServiceFieldAction, same as the inline name/description fields on
 *  the card above. No separate "Save" button: a field that saved instantly
 *  everywhere else but needed an explicit click here was the likely cause
 *  of "some text won't save" — an edit made and then not immediately
 *  followed by that click looked identical to a bug. */
function ServiceDetailsForm({ service }: { service: Service }) {
  const [faqs, setFaqs] = useState<ServiceFaq[]>(service.faqs);

  function persistFaqs(next: ServiceFaq[]) {
    const cleaned = next.filter((f) => f.question.trim() && f.answer.trim());
    void patchServiceFieldAction(service.id, { faqs: cleaned });
  }

  function updateFaq(index: number, field: keyof ServiceFaq, value: string) {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  function removeFaq(index: number) {
    setFaqs((prev) => {
      const next = prev.filter((_, i) => i !== index);
      persistFaqs(next);
      return next;
    });
  }

  function commitField(field: "content" | "seoTitle" | "metaDescription", value: string) {
    const current = (service[field] ?? "") as string;
    if (value === current) return;
    void patchServiceFieldAction(service.id, { [field]: value });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`content-${service.id}`} className="text-xs">
          Page content
        </Label>
        <Textarea
          id={`content-${service.id}`}
          rows={5}
          defaultValue={service.content ?? ""}
          placeholder="What it is, when to call, what's involved. Separate paragraphs with a blank line."
          onBlur={(e) => commitField("content", e.currentTarget.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs">Frequently asked questions</Label>
        {faqs.map((faq, index) => (
          <div key={index} className="flex flex-col gap-1.5 rounded-lg border p-2.5">
            <div className="flex items-start gap-2">
              <Input
                placeholder="Question"
                value={faq.question}
                onChange={(e) => updateFaq(index, "question", e.target.value)}
                onBlur={() => persistFaqs(faqs)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove FAQ"
                onClick={() => removeFaq(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Answer"
              rows={2}
              value={faq.answer}
              onChange={(e) => updateFaq(index, "answer", e.target.value)}
              onBlur={() => persistFaqs(faqs)}
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setFaqs((prev) => [...prev, { question: "", answer: "" }])}
        >
          <Plus className="size-4" /> Add FAQ
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`seoTitle-${service.id}`} className="text-xs">
          SEO title (optional)
        </Label>
        <Input
          id={`seoTitle-${service.id}`}
          defaultValue={service.seoTitle ?? ""}
          onBlur={(e) => commitField("seoTitle", e.currentTarget.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`metaDescription-${service.id}`} className="text-xs">
          Meta description (optional)
        </Label>
        <Textarea
          id={`metaDescription-${service.id}`}
          rows={2}
          defaultValue={service.metaDescription ?? ""}
          onBlur={(e) => commitField("metaDescription", e.currentTarget.value)}
        />
      </div>
    </div>
  );
}
