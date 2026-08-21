// Curated, structured choices — not an open-ended template builder. Fonts
// are @react-pdf/renderer's built-in standard PDF fonts only (no external
// font fetching at render time — no network dependency, no risk of a slow
// or failing PDF generation because a font URL didn't respond).

export interface AccentColorOption {
  value: string;
  label: string;
}

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  { value: "#1e3a5f", label: "Navy" },
  { value: "#334155", label: "Slate" },
  { value: "#065f46", label: "Forest" },
  { value: "#7c2d12", label: "Burgundy" },
  { value: "#1f2937", label: "Charcoal" },
  { value: "#0f766e", label: "Teal" },
];

export const DEFAULT_ACCENT_COLOR = ACCENT_COLOR_OPTIONS[0].value;

export interface FontFamilyOption {
  value: string;
  label: string;
}

export const FONT_FAMILY_OPTIONS: FontFamilyOption[] = [
  { value: "Helvetica", label: "Helvetica (clean, modern)" },
  { value: "Times-Roman", label: "Times (traditional, professional)" },
  { value: "Courier", label: "Courier (monospace)" },
];

export const DEFAULT_FONT_FAMILY = FONT_FAMILY_OPTIONS[0].value;

export function resolveAccentColor(value: string | null | undefined): string {
  if (value && ACCENT_COLOR_OPTIONS.some((o) => o.value === value)) return value;
  return DEFAULT_ACCENT_COLOR;
}

export function resolveFontFamily(value: string | null | undefined): string {
  if (value && FONT_FAMILY_OPTIONS.some((o) => o.value === value)) return value;
  return DEFAULT_FONT_FAMILY;
}
