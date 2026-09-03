"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHomepageSectionAction } from "@/lib/website/homepage-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/website/media-picker";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import type { homepageSections } from "@/lib/db/schema";

type HomepageSection = typeof homepageSections.$inferSelect;

const LIMIT_TYPES = new Set(["services", "gallery", "service_areas", "reviews"]);
const TEXT_TYPES = new Set(["why_mr_drain", "cta"]);

export function HomepageSectionForm({ section }: { section: HomepageSection }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const initialConfig = section.config as Record<string, unknown>;
  const initialPhotoKeys = Array.isArray(initialConfig.photoKeys)
    ? (initialConfig.photoKeys as string[])
    : [];
  const [photoKeys, setPhotoKeys] = useState<(string | undefined)[]>([
    initialPhotoKeys[0],
    initialPhotoKeys[1],
    initialPhotoKeys[2],
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateHomepageSectionAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  const config = initialConfig;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" encType="multipart/form-data">
      <input type="hidden" name="sectionId" value={section.id} />
      <div className="flex items-center gap-2">
        <Checkbox id={`active-${section.id}`} name="active" defaultChecked={section.active} />
        <Label htmlFor={`active-${section.id}`} className="font-normal">
          Show this section on the homepage
        </Label>
      </div>

      {LIMIT_TYPES.has(section.sectionType) ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`limit-${section.id}`} className="text-xs">
            How many to show
          </Label>
          <Input
            id={`limit-${section.id}`}
            name="limit"
            type="number"
            min={1}
            max={20}
            className="w-24"
            defaultValue={typeof config.limit === "number" ? config.limit : undefined}
          />
        </div>
      ) : null}

      {TEXT_TYPES.has(section.sectionType) ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`heading-${section.id}`} className="text-xs">
              Heading
            </Label>
            <Input
              id={`heading-${section.id}`}
              name="heading"
              defaultValue={typeof config.heading === "string" ? config.heading : ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`body-${section.id}`} className="text-xs">
              Body text
            </Label>
            <Textarea
              id={`body-${section.id}`}
              name="body"
              rows={2}
              defaultValue={typeof config.body === "string" ? config.body : ""}
            />
          </div>
        </>
      ) : null}

      {section.sectionType === "why_mr_drain" ? (
        <div className="flex flex-col gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            The 4 points below (icons are fixed). Leave a field blank to keep its default text.
          </p>
          {([1, 2, 3, 4] as const).map((n) => {
            const points = Array.isArray(config.points) ? config.points : [];
            const point = (points[n - 1] ?? {}) as Record<string, unknown>;
            return (
              <div key={n} className="flex flex-col gap-1.5 rounded-md border p-2.5">
                <Label htmlFor={`point${n}Title-${section.id}`} className="text-xs">
                  Point {n} title
                </Label>
                <Input
                  id={`point${n}Title-${section.id}`}
                  name={`point${n}Title`}
                  defaultValue={typeof point.title === "string" ? point.title : ""}
                />
                <Label htmlFor={`point${n}Body-${section.id}`} className="text-xs">
                  Point {n} body
                </Label>
                <Textarea
                  id={`point${n}Body-${section.id}`}
                  name={`point${n}Body`}
                  rows={2}
                  defaultValue={typeof point.body === "string" ? point.body : ""}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {section.sectionType === "hero" ? (
        <div className="flex flex-col gap-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Pick up to 3 photos for a collage in place of the logo. With none set, the logo is shown
            instead.
          </p>
          {([1, 2, 3] as const).map((n) => {
            const key = photoKeys[n - 1];
            return (
              <div key={n} className="flex flex-col gap-1.5 rounded-md border p-2.5">
                <Label className="text-xs">Photo {n}</Label>
                {key ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview thumbnail, same pattern as invoice-settings-form.tsx
                  <img
                    src={publicAssetUrl(key)}
                    alt=""
                    className="h-20 w-28 rounded-md border object-cover"
                  />
                ) : null}
                <input type="hidden" name={`existingPhoto${n}Key`} value={key ?? ""} />
                <div className="flex items-center gap-2">
                  <MediaPicker
                    triggerLabel={key ? "Replace" : "Choose photo"}
                    onSelect={(newKey) =>
                      setPhotoKeys((prev) => {
                        const next = [...prev];
                        next[n - 1] = newKey;
                        return next;
                      })
                    }
                  />
                  {key ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPhotoKeys((prev) => {
                          const next = [...prev];
                          next[n - 1] = undefined;
                          return next;
                        })
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
