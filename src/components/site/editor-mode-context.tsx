"use client";

import { createContext, useContext } from "react";

/**
 * Presence of this context is how a section component (hero-section.tsx,
 * why-mr-drain-section.tsx, etc.) knows it's being rendered inside the
 * visual editor (website/editor) rather than on the live public site — the
 * live site never wraps a provider around renderHomepageSection's output,
 * so `useEditorMode()` there is always null and every section renders
 * exactly as it always has, with zero extra DOM.
 *
 * Kept intentionally narrow (two whitelisted patch shapes) rather than a
 * generic "run this mutation" escape hatch — see the matching allowlists in
 * patchHomepageSectionConfigAction and patchWebsiteSettingsFieldAction. This
 * is the guardrail: a section can offer inline editing for its own known
 * text fields, never for arbitrary new content.
 */
export interface EditorMode {
  /** Merges `patch` into one homepage_sections row's `config` JSON. */
  patchSectionConfig: (sectionId: string, patch: Record<string, unknown>) => void;
  /** Sets one whitelisted website-settings text column. */
  patchSettingsField: (field: string, value: string) => void;
}

export const EditorModeContext = createContext<EditorMode | null>(null);

export function useEditorMode(): EditorMode | null {
  return useContext(EditorModeContext);
}
