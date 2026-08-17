"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadJobPhotoAction } from "@/lib/jobs/job-photo-actions";
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

const CATEGORIES = [
  { value: "before", label: "Before" },
  { value: "during", label: "During" },
  { value: "after", label: "After" },
  { value: "other", label: "Other" },
] as const;

export function PhotoUploadForm({ jobId }: { jobId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await uploadJobPhotoAction(undefined, formData);
      if (result?.ok) {
        setError(null);
        formRef.current?.reset();
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="jobId" value={jobId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo-file" className="text-xs">
          Photo
        </Label>
        <Input id="photo-file" name="file" type="file" accept="image/*" required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo-category" className="text-xs">
          Category
        </Label>
        <Select name="category" defaultValue="other">
          <SelectTrigger id="photo-category" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="photo-caption" className="text-xs">
          Caption (optional)
        </Label>
        <Input id="photo-caption" name="caption" className="w-40" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
