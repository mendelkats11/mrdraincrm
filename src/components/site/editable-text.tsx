"use client";

import { useEffect, useRef, type ElementType, type FocusEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Click-directly-on-the-text editing, in place of a side panel form field.
 * With no `onCommit` (the live public site, and any admin context that
 * hasn't wired one up) this renders as plain text — identical DOM to
 * before this component existed. `onCommit` is only ever passed by a
 * section component reading from EditorModeContext, so this component
 * itself doesn't need to know *what* it's editing or where it's saved.
 */
export function EditableText({
  as = "span",
  className,
  value,
  onCommit,
  multiline = false,
  placeholder,
}: {
  as?: ElementType;
  className?: string;
  value: string;
  onCommit?: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const Tag = as;
  const ref = useRef<HTMLElement>(null);

  // Only pushes `value` into the DOM when it changed from *outside* this
  // element (e.g. another viewer's edit landing via a refresh) — never
  // while it's focused, or a re-render mid-keystroke would fight the
  // user's own typing and reset the caret.
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);

  if (!onCommit) {
    return value ? <Tag className={className}>{value}</Tag> : null;
  }

  function commit(e: FocusEvent<HTMLElement>) {
    const raw = multiline ? e.currentTarget.innerText : (e.currentTarget.textContent ?? "");
    const next = multiline ? raw.replace(/\s+$/, "") : raw.trim();
    if (next !== value) onCommit?.(next);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.currentTarget.textContent = value;
      e.currentTarget.blur();
    }
  }

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={cn(
        className,
        "cursor-text rounded-sm outline-none transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:ring-2 focus:ring-primary/50",
        !value && "italic text-muted-foreground empty:before:content-[attr(data-placeholder)]",
      )}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    >
      {value || null}
    </Tag>
  );
}
