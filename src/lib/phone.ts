import { type CountryCode, parsePhoneNumberFromString } from "libphonenumber-js";

// Service areas are all in Saskatchewan (docs/PROJECT_SPEC.md §4) — CA is a
// reasonable default for numbers entered without a country code.
const DEFAULT_COUNTRY: CountryCode = "CA";

export interface NormalizedPhone {
  /** Full E.164 form, e.g. "+13065551234" — stored as contact_phones.phone_e164. */
  e164: string;
  /** E.164 without the leading "+" — stored as contact_phones.phone_normalized
   *  and what duplicate/search matching queries against. */
  normalized: string;
}

/**
 * Parses and normalizes a phone number for storage. Returns null for
 * anything that doesn't parse as a valid number, rather than throwing, so
 * callers can turn it into a clean form-validation error.
 */
export function normalizePhone(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): NormalizedPhone | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;

  const e164 = parsed.number;
  return { e164, normalized: e164.replace(/^\+/, "") };
}

export function formatPhoneForDisplay(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  return parsed ? parsed.formatNational() : e164;
}
