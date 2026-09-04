"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, MapPin, Plus, Star, X } from "lucide-react";
import { EditableText } from "@/components/site/editable-text";
import { MediaPicker } from "@/components/website/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import {
  addServiceAreaImageAction,
  createServiceAreaAction,
  patchServiceAreaFieldAction,
  removeServiceAreaImageAction,
  setServiceAreaActiveAction,
  setServiceAreaCoverImageAction,
  updateServiceAreaAction,
} from "@/lib/website/service-area-website-actions";
import type { serviceAreas } from "@/lib/db/schema";
import type { ServiceAreaFaq } from "@/lib/website/service-areas";

type ServiceArea = typeof serviceAreas.$inferSelect;

/**
 * The Service Areas page in the visual editor — same shape as Services:
 * name and description click-to-edit on the card, the cover photo swaps
 * from the hover toolbar, and the fields that were never a single line of
 * text (the full image gallery, FAQs, Call Now number, region, SEO) live
 * behind "Details", reusing updateServiceAreaAction wholesale.
 */
export function ServiceAreasEditor({
  serviceAreas: initialAreas,
}: {
  serviceAreas: ServiceArea[];
}) {
  const [areas, setAreas] = useState(initialAreas);
  const [prevInitialAreas, setPrevInitialAreas] = useState(initialAreas);
  if (initialAreas !== prevInitialAreas) {
    setPrevInitialAreas(initialAreas);
    setAreas(initialAreas);
  }
  const [adding, setAdding] = useState(false);

  function patchLocal(id: string, patch: Partial<ServiceArea>) {
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Service Areas</h1>
          <p className="text-sm text-muted-foreground">
            Click a name or description to edit it directly. Hidden areas still have their own page
            but won&apos;t appear in the site&apos;s service-areas list.
          </p>
        </div>
        {!adding ? (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add area
          </Button>
        ) : null}
      </div>

      {adding ? <NewAreaForm onCancel={() => setAdding(false)} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <AreaCard key={area.id} area={area} onPatch={(patch) => patchLocal(area.id, patch)} />
        ))}
      </div>
    </div>
  );
}

function NewAreaForm({ onCancel }: { onCancel: () => void }) {
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
      const result = await createServiceAreaAction(undefined, formData);
      if (result?.ok) {
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
        placeholder="Area name, e.g. Rosewood"
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

function AreaCard({
  area,
  onPatch,
}: {
  area: ServiceArea;
  onPatch: (patch: Partial<ServiceArea>) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const cover = area.images[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative h-40 w-full bg-primary/10">
        {cover ? (
          <Image src={publicAssetUrl(cover)} alt="" fill className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-primary">
            <MapPin className="size-8" aria-hidden="true" />
          </div>
        )}
        {!area.active ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Hidden
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-1.5 opacity-0 transition group-hover:opacity-100">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border bg-card/95 p-0.5 shadow-sm">
            <MediaPicker
              triggerLabel="Cover"
              onSelect={(key) => {
                onPatch({ images: [key, ...area.images.filter((k) => k !== key)] });
                void setServiceAreaCoverImageAction(area.id, key);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={pending}
              aria-label={area.active ? "Hide" : "Show"}
              title={area.active ? "Hide from service areas list" : "Show on service areas list"}
              onClick={() => {
                setPending(true);
                onPatch({ active: !area.active });
                void setServiceAreaActiveAction(area.id, !area.active).finally(() =>
                  setPending(false),
                );
              }}
            >
              {area.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-3">
        <EditableText
          as="p"
          className="font-semibold text-brand-navy"
          value={area.name}
          onCommit={(v) => {
            onPatch({ name: v });
            void patchServiceAreaFieldAction(area.id, { name: v });
          }}
        />
        <EditableText
          as="p"
          multiline
          className="text-sm text-foreground/70"
          value={area.copy ?? ""}
          placeholder="Add a short description (shown on this area's page)"
          onCommit={(v) => {
            onPatch({ copy: v });
            void patchServiceAreaFieldAction(area.id, { copy: v });
          }}
        />
        <div className="mt-1 flex items-center justify-between">
          <a
            href={`/service-areas/${area.slug}`}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            /service-areas/{area.slug}
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

      {detailsOpen ? <AreaDetailsForm area={area} onPatch={onPatch} /> : null}
    </div>
  );
}

function AreaDetailsForm({
  area,
  onPatch,
}: {
  area: ServiceArea;
  onPatch: (patch: Partial<ServiceArea>) => void;
}) {
  const [faqs, setFaqs] = useState<ServiceAreaFaq[]>(area.faqs);
  const [pending, startTransition] = useTransition();
  const [imagePending, startImageTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function updateFaq(index: number, field: keyof ServiceAreaFaq, value: string) {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  function removeFaq(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // name/copy/active are edited elsewhere (inline on the card) — carried
    // through as their current values so this submission can't silently
    // overwrite them with "blank" just because this form has no field for
    // them.
    formData.set("name", area.name);
    formData.set("copy", area.copy ?? "");
    formData.set("active", area.active ? "on" : "");
    formData.set("faqs", JSON.stringify(faqs.filter((f) => f.question.trim() && f.answer.trim())));
    setSaved(false);
    startTransition(async () => {
      const result = await updateServiceAreaAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        setSaved(true);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border p-3">
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Images — the first one is the cover</Label>
        <div className="flex flex-wrap gap-2">
          {area.images.map((key, index) => (
            <div key={key} className="group/img relative">
              <Image
                src={publicAssetUrl(key)}
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-lg border object-cover"
              />
              {index === 0 ? (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none whitespace-nowrap text-primary-foreground">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  className="absolute -bottom-1 -left-1 hidden size-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow group-hover/img:flex hover:text-foreground"
                  aria-label="Set as cover image"
                  title="Set as cover image"
                  onClick={() =>
                    startImageTransition(async () => {
                      onPatch({ images: [key, ...area.images.filter((k) => k !== key)] });
                      await setServiceAreaCoverImageAction(area.id, key);
                      router.refresh();
                    })
                  }
                >
                  <Star className="size-3" />
                </button>
              )}
              <button
                type="button"
                className="absolute -right-1 -top-1 hidden size-5 items-center justify-center rounded-full bg-destructive text-xs text-white group-hover/img:flex"
                aria-label="Remove image"
                onClick={() =>
                  startImageTransition(async () => {
                    onPatch({ images: area.images.filter((k) => k !== key) });
                    await removeServiceAreaImageAction(area.id, key);
                    router.refresh();
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <MediaPicker
          triggerLabel="Add image"
          onSelect={(key) =>
            startImageTransition(async () => {
              onPatch({ images: [...area.images, key] });
              await addServiceAreaImageAction(area.id, key);
              router.refresh();
            })
          }
        />
        {imagePending ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label className="text-xs">Frequently asked questions</Label>
          {faqs.map((faq, index) => (
            <div key={index} className="flex flex-col gap-1.5 rounded-lg border p-2.5">
              <div className="flex items-start gap-2">
                <Input
                  placeholder="Question"
                  value={faq.question}
                  onChange={(e) => updateFaq(index, "question", e.target.value)}
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
          <Label htmlFor={`callrail-${area.id}`} className="text-xs">
            Call Now number (optional)
          </Label>
          <Input
            id={`callrail-${area.id}`}
            name="callrailTrackingNumber"
            defaultValue={area.callrailTrackingNumber ?? ""}
            placeholder="Uses the site default if left blank"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`region-${area.id}`} className="text-xs">
            Region (optional)
          </Label>
          <Input
            id={`region-${area.id}`}
            name="region"
            defaultValue={area.region ?? ""}
            placeholder="e.g. SK, BC"
            className="w-32"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`seoTitle-${area.id}`} className="text-xs">
            SEO title (optional)
          </Label>
          <Input id={`seoTitle-${area.id}`} name="seoTitle" defaultValue={area.seoTitle ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`metaDescription-${area.id}`} className="text-xs">
            Meta description (optional)
          </Label>
          <Textarea
            id={`metaDescription-${area.id}`}
            name="metaDescription"
            rows={2}
            defaultValue={area.metaDescription ?? ""}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </Button>
          {saved && !pending ? <span className="text-xs text-muted-foreground">Saved</span> : null}
        </div>
      </form>
    </div>
  );
}
