"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import {
  setServiceActiveAction,
  setServiceImageAction,
  updateServiceAction,
} from "@/lib/website/service-actions";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import { ToggleActionButton } from "@/components/website/toggle-action-button";
import { MediaPicker } from "@/components/website/media-picker";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { services } from "@/lib/db/schema";
import type { ServiceFaq } from "@/lib/website/services";

type Service = typeof services.$inferSelect;

export function ServiceRowActions({ service }: { service: Service }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [imagePending, startImageTransition] = useTransition();
  const [faqs, setFaqs] = useState<ServiceFaq[]>(service.faqs);
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const cleanFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());
    formData.set("faqs", JSON.stringify(cleanFaqs));
    startTransition(async () => {
      const result = await updateServiceAction(undefined, formData);
      if (result?.ok) {
        setOpen(false);
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function updateFaq(index: number, field: keyof ServiceFaq, value: string) {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  function removeFaq(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleImageSelect(key: string) {
    startImageTransition(async () => {
      await setServiceImageAction(service.id, key);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <ToggleActionButton
        active={service.active}
        labelOn="Hide"
        labelOff="Activate"
        action={() => setServiceActiveAction(service.id, !service.active)}
      />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setError(null);
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit service</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {service.imageKey ? (
                <Image
                  src={publicAssetUrl(service.imageKey)}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                  No image
                </div>
              )}
              <MediaPicker
                triggerLabel={service.imageKey ? "Replace image" : "Choose image"}
                onSelect={handleImageSelect}
              />
              {imagePending ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto"
            >
              <input type="hidden" name="serviceId" value={service.id} />
              <input type="hidden" name="active" value={service.active ? "on" : ""} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={service.name} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Short description</Label>
                <p className="text-xs text-muted-foreground">
                  Shown on the services list and used as the search-result snippet when no meta
                  description is set below.
                </p>
                <Textarea
                  id="description"
                  name="description"
                  rows={2}
                  defaultValue={service.description ?? ""}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="content">Page content</Label>
                <p className="text-xs text-muted-foreground">
                  The service&apos;s own page — what it is, when to call, what&apos;s involved.
                  Separate paragraphs with a blank line.
                </p>
                <Textarea
                  id="content"
                  name="content"
                  rows={8}
                  defaultValue={service.content ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Frequently asked questions</Label>
                {faqs.map((faq, index) => (
                  <div key={index} className="flex flex-col gap-1.5 rounded-lg border p-3">
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
                  onClick={() => setFaqs((prev) => [...prev, { question: "", answer: "" }])}
                  className="self-start"
                >
                  <Plus className="size-4" /> Add FAQ
                </Button>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seoTitle">SEO title (optional)</Label>
                <Input id="seoTitle" name="seoTitle" defaultValue={service.seoTitle ?? ""} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="metaDescription">Meta description (optional)</Label>
                <Textarea
                  id="metaDescription"
                  name="metaDescription"
                  rows={2}
                  defaultValue={service.metaDescription ?? ""}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
