"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Settings } from "lucide-react";
import { setDashboardWidgetsAction } from "@/lib/dashboard/dashboard-actions";
import { mergeOrder } from "@/lib/preferences/apply-order";
import {
  ALWAYS_VISIBLE_OPERATIONS_WIDGETS,
  OPERATIONS_WIDGET_IDS,
  OPERATIONS_WIDGET_LABELS,
  type OperationsWidgetId,
} from "@/lib/dashboard/widgets";
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

const DEFAULT_ORDER: string[] = [...OPERATIONS_WIDGET_IDS];
const ALWAYS_VISIBLE = new Set<string>(ALWAYS_VISIBLE_OPERATIONS_WIDGETS);

export function WidgetCustomizer({
  savedOrder,
  savedHidden,
}: {
  savedOrder: string[];
  savedHidden: string[];
}) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<string[]>(() => mergeOrder(DEFAULT_ORDER, savedOrder));
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(savedHidden));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    if (next) {
      setOrder(mergeOrder(DEFAULT_ORDER, savedOrder));
      setHidden(new Set(savedHidden));
    }
    setOpen(next);
  }

  function move(id: string, direction: -1 | 1) {
    setOrder((prev) => {
      const index = prev.indexOf(id);
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleHidden(id: string, checked: boolean) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      await setDashboardWidgetsAction(order, [...hidden]);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Settings className="size-4" />
          Customize
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize dashboard widgets</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1 rounded-md border p-2">
          {order.map((id, index) => {
            const alwaysVisible = ALWAYS_VISIBLE.has(id);
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <label className="flex flex-1 items-center gap-2">
                  <Checkbox
                    checked={!hidden.has(id)}
                    disabled={alwaysVisible}
                    onCheckedChange={(checked) => toggleHidden(id, checked === true)}
                  />
                  {OPERATIONS_WIDGET_LABELS[id as OperationsWidgetId]}
                  {alwaysVisible ? (
                    <span className="text-xs text-muted-foreground">(always shown)</span>
                  ) : null}
                </label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={index === 0}
                    onClick={() => move(id, -1)}
                    aria-label={`Move ${OPERATIONS_WIDGET_LABELS[id as OperationsWidgetId]} up`}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    disabled={index === order.length - 1}
                    onClick={() => move(id, 1)}
                    aria-label={`Move ${OPERATIONS_WIDGET_LABELS[id as OperationsWidgetId]} down`}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOrder(DEFAULT_ORDER);
              setHidden(new Set());
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
