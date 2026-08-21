"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Settings } from "lucide-react";
import { setSidebarPreferencesAction } from "@/lib/preferences/sidebar-actions";
import { mergeOrder } from "@/lib/preferences/apply-order";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DEFAULT_SIDEBAR_ORDER } from "@/lib/dashboard/sidebar-nav";
import { NAV_ITEMS } from "./sidebar";

export function SidebarCustomizer({
  savedOrder,
  savedHidden,
  collapsed: initialCollapsed,
}: {
  savedOrder: string[];
  savedHidden: string[];
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(() => mergeOrder(DEFAULT_SIDEBAR_ORDER, savedOrder));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(savedHidden));
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Re-sync local edit state to what's actually saved every time the
  // dialog is (re)opened, so a save-then-reopen (or opening after another
  // tab changed it) never shows stale in-progress edits.
  function handleOpenChange(next: boolean) {
    if (next) {
      setOrder(mergeOrder(DEFAULT_SIDEBAR_ORDER, savedOrder));
      setHidden(new Set(savedHidden));
      setCollapsed(initialCollapsed);
    }
    setOpen(next);
  }

  function move(href: string, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(href);
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleHidden(href: string, checked: boolean) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      await setSidebarPreferencesAction({
        itemOrder: order,
        itemHidden: [...hidden],
        collapsed,
      });
      setOpen(false);
      router.refresh();
    });
  }

  const itemsByHref = new Map(NAV_ITEMS.map((item) => [item.href, item]));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-2 shrink-0 text-muted-foreground"
          aria-label="Customize sidebar"
          title="Customize sidebar"
        >
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize sidebar</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={collapsed}
              onCheckedChange={(checked) => setCollapsed(checked === true)}
            />
            Collapse to icons only
          </label>
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-md border p-2">
            {order.map((href, index) => {
              const item = itemsByHref.get(href as (typeof NAV_ITEMS)[number]["href"]);
              if (!item) return null;
              return (
                <div
                  key={href}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <label className="flex flex-1 items-center gap-2">
                    <Checkbox
                      checked={!hidden.has(href)}
                      onCheckedChange={(checked) => toggleHidden(href, checked === true)}
                    />
                    {item.label}
                  </label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      disabled={index === 0}
                      onClick={() => move(href, -1)}
                      aria-label={`Move ${item.label} up`}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      disabled={index === order.length - 1}
                      onClick={() => move(href, 1)}
                      aria-label={`Move ${item.label} down`}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Opening this again always starts from your last-saved layout.
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOrder(DEFAULT_SIDEBAR_ORDER);
              setHidden(new Set());
              setCollapsed(false);
            }}
          >
            Reset to defaults
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
