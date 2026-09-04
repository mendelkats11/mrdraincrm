"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, GripVertical, Pencil, X } from "lucide-react";
import {
  HOMEPAGE_SECTION_LABELS,
  renderHomepageSection,
  type HomepageSectionRow,
} from "@/components/site/homepage-section-renderer";
import {
  toggleHomepageSectionActiveAction,
  reorderHomepageSectionAction,
} from "@/lib/website/homepage-actions";
import { HomepageSectionForm } from "../homepage/homepage-section-form";
import { Button } from "@/components/ui/button";
import type { galleryItems, reviews, serviceAreas, services } from "@/lib/db/schema";
import type { WebsiteSettings } from "@/lib/website/settings";

type EditorData = {
  settings: WebsiteSettings;
  services: (typeof services.$inferSelect)[];
  serviceAreas: (typeof serviceAreas.$inferSelect)[];
  galleryItems: (typeof galleryItems.$inferSelect)[];
  reviews: (typeof reviews.$inferSelect)[];
};

/**
 * The interactive part of the homepage editor: the real homepage, rendered
 * with the same renderHomepageSection() the live site uses, with hover
 * affordances (edit / hide / drag to reorder) laid over each section. This
 * replaces the old "list of forms next to an iframe preview" — the preview
 * *is* the editor now.
 */
export function HomepageEditor({
  sections: initialSections,
  data,
}: {
  sections: HomepageSectionRow[];
  data: EditorData;
}) {
  const [sections, setSections] = useState(initialSections);
  // Syncs after HomepageSectionForm's own router.refresh() re-runs the
  // server component with fresh content — this client component stays
  // mounted across that refresh, so its own useState wouldn't otherwise
  // pick up the new config. Drag/hide already update local state directly
  // and never call router.refresh(), so they're unaffected by this.
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const activeSections = sections.filter((s) => s.active);
  const hiddenSections = sections.filter((s) => !s.active);
  const editingSection = sections.find((s) => s.id === editingId) ?? null;

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
    <div className="site-theme">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Hover a section to edit, hide, or drag it to reorder. This is the live homepage — changes
          save immediately.
        </p>
      </div>

      {activeSections.map((section) => (
        <div
          key={section.id}
          draggable
          onDragStart={() => (draggedId.current = section.id)}
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
              <span
                className="flex size-7 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                <GripVertical className="size-4" />
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Edit ${HOMEPAGE_SECTION_LABELS[section.sectionType] ?? section.sectionType}`}
                onClick={() => setEditingId(section.id)}
              >
                <Pencil className="size-4" />
              </Button>
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
  );
}
