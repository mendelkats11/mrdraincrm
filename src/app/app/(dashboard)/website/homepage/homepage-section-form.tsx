"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHomepageSectionAction } from "@/lib/website/homepage-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { homepageSections } from "@/lib/db/schema";

type HomepageSection = typeof homepageSections.$inferSelect;

const LIMIT_TYPES = new Set(["services", "gallery", "service_areas", "reviews"]);
const TEXT_TYPES = new Set(["why_mr_drain", "cta"]);

export function HomepageSectionForm({ section }: { section: HomepageSection }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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

  const config = section.config as Record<string, unknown>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
