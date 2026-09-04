"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/phone";
import { useEditorMode } from "../editor-mode-context";
import { EditableText } from "../editable-text";

export function CtaSection({
  sectionId,
  heading,
  body,
  trackingNumber,
}: {
  /** Only present (and only used) when rendered inside the visual editor —
   *  see the identical note on WhyMrDrainSection. CtaSection is also used
   *  standalone on service/service-area detail pages, where it's omitted
   *  and this section renders as plain, non-editable text as always. */
  sectionId?: string;
  heading?: string;
  body?: string;
  trackingNumber: string | null;
}) {
  const editor = useEditorMode();

  function commitField(patch: (value: string) => Record<string, unknown>) {
    if (!editor || !sectionId) return undefined;
    return (value: string) => editor.patchSectionConfig(sectionId, patch(value));
  }

  return (
    <section className="bg-brand-navy">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center text-white">
        <EditableText
          as="h2"
          className="text-3xl font-bold"
          value={heading || "Got a plumbing problem?"}
          onCommit={commitField((v) => ({ heading: v }))}
        />
        <EditableText
          as="p"
          multiline
          className="max-w-xl text-white/70"
          value={
            body ||
            "Call now for fast help, or request a free quote and we'll get back to you quickly."
          }
          onCommit={commitField((v) => ({ body: v }))}
        />
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {trackingNumber ? (
            <a
              href={`tel:${trackingNumber}`}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md"
            >
              <Phone className="size-5" aria-hidden="true" />
              Call {formatPhoneForDisplay(trackingNumber)}
            </a>
          ) : null}
          <Link
            href="/contact"
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground shadow-md"
          >
            Get a Free Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
