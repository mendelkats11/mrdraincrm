"use client";

import { Clock, DollarSign, MapPin, Sparkles } from "lucide-react";
import { useEditorMode } from "../editor-mode-context";
import { EditableText } from "../editable-text";

// Icons are fixed per slot — only title/body are admin-editable (Website >
// Homepage editor, config.points[n].{title,body}), matching how the
// section's own heading/body already work: an empty override falls back
// to this default rather than rendering blank.
const DEFAULT_POINTS = [
  {
    icon: MapPin,
    title: "Local & family-owned",
    body: "Based right here in Saskatoon — we know the area and the neighbourhoods we serve.",
  },
  {
    icon: DollarSign,
    title: "Upfront, honest pricing",
    body: "You'll know the cost before we start. No surprise fees, no upselling.",
  },
  {
    icon: Clock,
    title: "Fast response",
    body: "We show up when we say we will, and we move quickly on urgent issues.",
  },
  {
    icon: Sparkles,
    title: "Clean, respectful work",
    body: "We treat your home like our own — clean workspace, clear communication.",
  },
] as const;

export interface WhyMrDrainPointOverride {
  title?: string;
  body?: string;
}

export function WhyMrDrainSection({
  sectionId,
  heading,
  body,
  points,
}: {
  /** Homepage section row id — only present when rendered inside the
   *  visual editor (renderHomepageSection always passes it, but it's only
   *  *used* here to build a save patch, so it's inert on the live site). */
  sectionId?: string;
  heading?: string;
  body?: string;
  points?: WhyMrDrainPointOverride[];
}) {
  const editor = useEditorMode();
  const resolvedPoints = DEFAULT_POINTS.map((defaultPoint, i) => ({
    icon: defaultPoint.icon,
    title: points?.[i]?.title || defaultPoint.title,
    body: points?.[i]?.body || defaultPoint.body,
  }));

  // Only builds a save callback when both an editor context and a section
  // id are present — undefined here is exactly what tells EditableText to
  // fall back to plain, non-editable text.
  function commitField(patch: (value: string) => Record<string, unknown>) {
    if (!editor || !sectionId) return undefined;
    return (value: string) => editor.patchSectionConfig(sectionId, patch(value));
  }

  // Builds the full 4-item points array for a single-field edit — the
  // section stores config.points as one array, so editing point 2's title
  // still has to submit all 4 points' title/body. Icons are dropped: they're
  // fixed per slot (DEFAULT_POINTS) and aren't serializable across the
  // server action boundary anyway.
  function patchPoint(index: number, field: "title" | "body", value: string) {
    return resolvedPoints.map((point, i) => ({
      title: i === index && field === "title" ? value : point.title,
      body: i === index && field === "body" ? value : point.body,
    }));
  }

  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 flex flex-col items-center gap-2 text-center">
          <EditableText
            as="h2"
            className="text-3xl font-bold text-brand-navy"
            value={heading || "Why Mr. Drain"}
            onCommit={commitField((v) => ({ heading: v }))}
          />
          {body || (editor && sectionId) ? (
            <EditableText
              as="p"
              multiline
              className="max-w-xl text-foreground/70"
              value={body || ""}
              placeholder="Add a line of body text (optional)"
              onCommit={commitField((v) => ({ body: v }))}
            />
          ) : null}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {resolvedPoints.map((point, i) => (
            <div key={i} className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <point.icon className="size-6" aria-hidden="true" />
              </div>
              <EditableText
                as="h3"
                className="font-semibold text-brand-navy"
                value={point.title}
                onCommit={commitField((v) => ({ points: patchPoint(i, "title", v) }))}
              />
              <EditableText
                as="p"
                multiline
                className="text-sm text-foreground/70"
                value={point.body}
                onCommit={commitField((v) => ({ points: patchPoint(i, "body", v) }))}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
