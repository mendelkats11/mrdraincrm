"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Plus, Star, Trash2 } from "lucide-react";
import { EditableText } from "@/components/site/editable-text";
import { MediaPicker } from "@/components/website/media-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { publicAssetUrl } from "@/lib/storage/public-asset-upload";
import {
  createPortfolioJobAction,
  deletePortfolioJobAction,
  patchPortfolioJobAction,
  setPortfolioJobCoverAction,
  setPortfolioJobFeaturedAction,
  setPortfolioJobHiddenAction,
  setPortfolioJobTagsAction,
} from "@/lib/website/portfolio-job-actions";
import type { portfolioJobs, serviceAreas, services } from "@/lib/db/schema";

type Job = typeof portfolioJobs.$inferSelect;
type Service = typeof services.$inferSelect;
type ServiceArea = typeof serviceAreas.$inferSelect;

/**
 * The Jobs page in the visual editor — each card is a real job the same way
 * a homepage section is a real section: click its title to rename it, click
 * its photo to replace the cover, everything else lives behind a small
 * "Details" toggle for the couple of fields (description, tags) that aren't
 * a single line of text. New jobs get their own /gallery/[slug] page the
 * moment they're created.
 */
export function JobsEditor({
  jobs: initialJobs,
  services,
  serviceAreas,
}: {
  jobs: Job[];
  services: Service[];
  serviceAreas: ServiceArea[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [adding, setAdding] = useState(false);

  function patchLocal(id: string, patch: Partial<Job>) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }

  async function handleCreate(coverImageKey: string) {
    const result = await createPortfolioJobAction(coverImageKey);
    if (!result.ok || !result.id || !result.slug || !result.title) return;
    setJobs((prev) => [
      {
        id: result.id!,
        slug: result.slug!,
        title: result.title!,
        description: null,
        coverImageKey,
        serviceId: null,
        serviceAreaId: null,
        featured: false,
        hidden: false,
        completedAt: null,
        sortOrder: prev.length,
        createdAt: new Date(),
      },
      ...prev,
    ]);
    setAdding(false);
  }

  function handleDelete(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    void deletePortfolioJobAction(id);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Each job gets its own page on the site. Click a title to rename it, click a photo to
            replace the cover — everything saves immediately.
          </p>
        </div>
        {!adding ? (
          <Button type="button" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add job
          </Button>
        ) : null}
      </div>

      {adding ? <NewJobForm onCreate={handleCreate} onCancel={() => setAdding(false)} /> : null}

      {jobs.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No jobs yet — add your first one above.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              services={services}
              serviceAreas={serviceAreas}
              onPatch={(patch) => patchLocal(job.id, patch)}
              onDelete={() => handleDelete(job.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NewJobForm({
  onCreate,
  onCancel,
}: {
  onCreate: (coverImageKey: string) => void;
  onCancel: () => void;
}) {
  const [coverImageKey, setCoverImageKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!coverImageKey) return;
    setSaving(true);
    await onCreate(coverImageKey);
    setSaving(false);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center">
      {coverImageKey ? (
        <div className="relative size-9 shrink-0 overflow-hidden rounded-md border">
          <Image src={publicAssetUrl(coverImageKey)} alt="" fill className="object-cover" />
        </div>
      ) : null}
      <MediaPicker
        triggerLabel={coverImageKey ? "Change photo" : "Choose cover photo"}
        onSelect={setCoverImageKey}
      />
      {/* No title field — one's generated automatically (a Service +
          Location + Intent combination) the moment the photo's picked, so
          adding a job is just "pick a photo." Renameable after, same as
          always. */}
      <p className="text-xs text-muted-foreground">A title is generated automatically.</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={!coverImageKey || saving} onClick={handleSubmit}>
          {saving ? "Creating…" : "Create"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function JobCard({
  job,
  services,
  serviceAreas,
  onPatch,
  onDelete,
}: {
  job: Job;
  services: Service[];
  serviceAreas: ServiceArea[];
  onPatch: (patch: Partial<Job>) => void;
  onDelete: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-square">
        <Image src={publicAssetUrl(job.coverImageKey)} alt="" fill className="object-cover" />
        {job.hidden || job.featured ? (
          <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
            {job.hidden ? (
              <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                Hidden
              </span>
            ) : null}
            {job.featured ? (
              <span className="rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Featured
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-1.5 opacity-70 transition group-hover:opacity-100">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-md border bg-card/95 p-0.5 shadow-sm">
            <MediaPicker
              triggerLabel="Cover"
              onSelect={(key) => {
                onPatch({ coverImageKey: key });
                void setPortfolioJobCoverAction(job.id, key);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={job.featured ? "Unfeature" : "Feature"}
              title={job.featured ? "Unfeature" : "Feature"}
              onClick={() => {
                onPatch({ featured: !job.featured });
                void setPortfolioJobFeaturedAction(job.id, !job.featured);
              }}
            >
              <Star className={job.featured ? "size-4 fill-current" : "size-4"} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={job.hidden ? "Show" : "Hide"}
              title={job.hidden ? "Show on site" : "Hide from site"}
              onClick={() => {
                onPatch({ hidden: !job.hidden });
                void setPortfolioJobHiddenAction(job.id, !job.hidden);
              }}
            >
              {job.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              aria-label="Delete job"
              title="Delete job"
              onClick={() => {
                if (window.confirm(`Delete "${job.title}"? This can't be undone.`)) onDelete();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2.5">
        <EditableText
          as="p"
          className="text-sm font-medium text-foreground"
          value={job.title}
          onCommit={(v) => {
            onPatch({ title: v });
            void patchPortfolioJobAction(job.id, { title: v });
          }}
        />
        <div className="flex items-center justify-between">
          {job.slug ? (
            <a
              href={`/gallery/${job.slug}`}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs text-muted-foreground hover:text-primary hover:underline"
            >
              /gallery/{job.slug}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">saving…</span>
          )}
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground hover:text-primary hover:underline"
            onClick={() => setDetailsOpen((v) => !v)}
          >
            {detailsOpen ? "Close" : "Details"}
          </button>
        </div>
      </div>

      {detailsOpen ? (
        <div className="flex flex-col gap-2 border-t border-border p-2.5">
          <label className="text-xs font-medium text-muted-foreground">
            Description
            <Textarea
              rows={3}
              defaultValue={job.description ?? ""}
              placeholder="What was done, for this job's own page (optional)"
              className="mt-1"
              onBlur={(e) => {
                const value = e.currentTarget.value;
                if (value !== (job.description ?? "")) {
                  onPatch({ description: value });
                  void patchPortfolioJobAction(job.id, { description: value });
                }
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              Service
              <select
                defaultValue={job.serviceId ?? ""}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                onChange={(e) => {
                  onPatch({ serviceId: e.target.value || null });
                  void setPortfolioJobTagsAction(job.id, e.target.value, job.serviceAreaId ?? "");
                }}
              >
                <option value="">—</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Area
              <select
                defaultValue={job.serviceAreaId ?? ""}
                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                onChange={(e) => {
                  onPatch({ serviceAreaId: e.target.value || null });
                  void setPortfolioJobTagsAction(job.id, job.serviceId ?? "", e.target.value);
                }}
              >
                <option value="">—</option>
                {serviceAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
