"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, GripVertical, Pencil, X } from "lucide-react";
import {
  HOMEPAGE_SECTION_LABELS,
  renderHomepageSection,
  type HomepageSectionRow,
} from "@/components/site/homepage-section-renderer";
import { EditorModeContext, type EditorMode } from "@/components/site/editor-mode-context";
import {
  toggleHomepageSectionActiveAction,
  reorderHomepageSectionAction,
  patchHomepageSectionConfigAction,
} from "@/lib/website/homepage-actions";
import { patchWebsiteSettingsFieldAction } from "@/lib/website/settings-actions";
import { HomepageSectionForm } from "../homepage/homepage-section-form";
import { Button } from "@/components/ui/button";
import type { portfolioJobs, reviews, serviceAreas, services } from "@/lib/db/schema";
import type { WebsiteSettings } from "@/lib/website/settings";

type EditorData = {
  settings: WebsiteSettings;
  services: (typeof services.$inferSelect)[];
  serviceAreas: (typeof serviceAreas.$inferSelect)[];
  portfolioJobs: (typeof portfolioJobs.$inferSelect)[];
  reviews: (typeof reviews.$inferSelect)[];
};

// Section types with no config left that isn't already inline-editable text
// (why_mr_drain, cta) skip the pencil/side-panel entirely — hero still needs
// it for its photo picker, and services/gallery/service_areas/reviews for
// their "how many to show" count.
const PANEL_SECTION_TYPES = new Set(["hero", "services", "gallery", "service_areas", "reviews"]);

/**
 * The interactive part of the homepage editor: the real homepage, rendered
 * with the same renderHomepageSection() the live site uses. Text is edited
 * by clicking directly on it (EditorModeContext, read by each section
 * component) rather than through a side form; hovering a section still
 * reveals a small toolbar for hide / drag-to-reorder / (for a few section
 * types) a panel for the one or two fields that aren't plain text.
 */
export function HomepageEditor({
  sections: initialSections,
  data: initialData,
}: {
  sections: HomepageSectionRow[];
  data: EditorData;
}) {
  const [sections, setSections] = useState(initialSections);
  const [settings, setSettings] = useState(initialData.settings);
  // Resyncs after HomepageSectionForm's own router.refresh() re-runs the
  // server component with fresh content — this client component stays
  // mounted across that refresh, so its own useState wouldn't otherwise pick
  // up the new config. Drag/hide/inline-text edits all update local state
  // directly and never call router.refresh(), so they're unaffected by this.
  // Adjusting state during render (comparing against the last-seen prop,
  // React's documented alternative to an effect here) rather than in a
  // useEffect avoids an extra commit-then-rerender pass.
  const [prevInitialSections, setPrevInitialSections] = useState(initialSections);
  if (initialSections !== prevInitialSections) {
    setPrevInitialSections(initialSections);
    setSections(initialSections);
  }
  const [prevInitialSettings, setPrevInitialSettings] = useState(initialData.settings);
  if (initialData.settings !== prevInitialSettings) {
    setPrevInitialSettings(initialData.settings);
    setSettings(initialData.settings);
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const data: EditorData = { ...initialData, settings };
  const activeSections = sections.filter((s) => s.active);
  const hiddenSections = sections.filter((s) => !s.active);
  const editingSection = sections.find((s) => s.id === editingId) ?? null;

  const editorMode = useMemo<EditorMode>(
    () => ({
      patchSectionConfig: (sectionId, patch) => {
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? { ...s, config: { ...(s.config as Record<string, unknown>), ...patch } }
              : s,
          ),
        );
        void patchHomepageSectionConfigAction(sectionId, patch);
      },
      patchSettingsField: (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
        void patchWebsiteSettingsFieldAction(field, value);
      },
    }),
    [],
  );

  function handleDrop(overId: string) {
    const fromId = draggedId.current;
    draggedId.current = null;
    setDragOverId(null);
    if (!fromId || fromId === overId) return;

    const current = sections;
    const fromIdx = current.findIndex((s) => s.id === fromId);
    const toIdx = current.findIndex((s) => s.id === overId);
    if (fromIdx === -1 || toIdx === -1) return;

    const next = [...current];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const reindexed = next.map((s, i) => ({ ...s, sortOrder: i }));
    setSections(reindexed);

    for (const s of reindexed) {
      const before = current.find((c) => c.id === s.id);
      if (before && before.sortOrder !== s.sortOrder) {
        void reorderHomepageSectionAction(s.id, s.sortOrder);
      }
    }
  }

  function handleToggleActive(id: string, active: boolean) {
    setPendingId(id);
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)));
    void toggleHomepageSectionActiveAction(id, active).finally(() => setPendingId(null));
  }

  return (
    <EditorModeContext.Provider value={editorMode}>
      <div className="site-theme">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Click any text to edit it directly. Hover a section to hide it or drag it to reorder —
            everything saves immediately.
          </p>
        </div>

        {activeSections.map((section) => (
          <div
            key={section.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverId !== section.id) setDragOverId(section.id);
            }}
            onDragLeave={() => setDragOverId((id) => (id === section.id ? null : id))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(section.id);
            }}
            className={
              "group relative " +
              (dragOverId === section.id
                ? "outline outline-2 outline-offset-[-2px] outline-primary"
                : "")
            }
          >
            <div className="pointer-events-none absolute inset-0 z-10 opacity-0 ring-2 ring-inset ring-primary/40 transition group-hover:opacity-100" />
            {/* The toolbar itself is `sticky` inside an `absolute inset-0`
                wrapper the size of the whole section, so on a tall section
                (Services) it stays reachable near the top of the viewport
                instead of scrolling off with the section's own top edge —
                while the absolute positioning keeps it out of layout flow so
                it can never push the real content down and break pixel
                parity with the live site. */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-end">
              <div className="pointer-events-auto sticky top-14 mr-3 mt-3 flex items-center gap-1 rounded-md border bg-card p-1 opacity-0 shadow-sm transition group-hover:opacity-100">
                {/* draggable lives on this handle alone, not the section
                    wrapper — putting it on the whole section would let the
                    browser's native drag gesture hijack ordinary click-drag
                    text selection inside the contentEditable fields below. */}
                <span
                  draggable
                  onDragStart={() => (draggedId.current = section.id)}
                  className="flex size-7 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <GripVertical className="size-4" />
                </span>
                {PANEL_SECTION_TYPES.has(section.sectionType) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Edit ${HOMEPAGE_SECTION_LABELS[section.sectionType] ?? section.sectionType}`}
                    title={section.sectionType === "hero" ? "Photos" : "How many to show"}
                    onClick={() => setEditingId(section.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={pendingId === section.id}
                  aria-label={`Hide ${HOMEPAGE_SECTION_LABELS[section.sectionType] ?? section.sectionType}`}
                  title="Hide this section"
                  onClick={() => handleToggleActive(section.id, false)}
                >
                  <Eye className="size-4" />
                </Button>
              </div>
            </div>
            {renderHomepageSection(section, data)}
          </div>
        ))}

        {hiddenSections.length > 0 ? (
          <div className="mx-auto max-w-6xl px-4 py-6">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Hidden sections — not shown on the homepage
            </p>
            <div className="flex flex-wrap gap-2">
              {hiddenSections.map((section) => (
                <Button
                  key={section.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pendingId === section.id}
                  onClick={() => handleToggleActive(section.id, true)}
                >
                  + Show {HOMEPAGE_SECTION_LABELS[section.sectionType] ?? section.sectionType}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {editingSection ? (
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l bg-background shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {HOMEPAGE_SECTION_LABELS[editingSection.sectionType] ?? editingSection.sectionType}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close"
                onClick={() => setEditingId(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <HomepageSectionForm section={editingSection} />
            </div>
          </div>
        ) : null}
      </div>
    </EditorModeContext.Provider>
  );
}
