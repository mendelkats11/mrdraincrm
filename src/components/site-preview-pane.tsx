"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DESKTOP_WIDTH = 1280;

/**
 * Embeds the real public page for the section currently being edited, so a
 * save's effect is visible without leaving the admin screen (docs feature
 * request: "add a preview of what it currently looks like, and it should be
 * live"). This is the actual live site, not a re-implementation — it can
 * only reflect what's already been saved (Website CMS pages don't hold
 * unsaved draft state the way the invoice/quote forms' client-side preview
 * does). Refresh is manual only (owner decision — auto-refreshing every
 * few seconds made the pane unpleasant to just look at); the button is the
 * only way it ever reloads.
 *
 * The pane itself is a few hundred px wide (it shares a row with the edit
 * form), which is why the site's own responsive CSS was always rendering
 * its mobile layout — there's no "make it show desktop" without actually
 * giving the iframe desktop-width content to render. Desktop mode renders
 * the iframe at a real 1280px and scales the whole thing down with a CSS
 * transform to fit the pane, same technique browser devtools' own device
 * toolbar uses — so "desktop won't fit as well, it'll be smaller" (the
 * owner's own expectation) is exactly what happens.
 *
 * Framing is only possible because next.config.ts grants the app's own
 * origin (and only that origin) an exception to the public site's normal
 * frame-ancestors 'none' — see the comment there.
 */
export function SitePreviewPane({ origin, path }: { origin: string; path: string }) {
  const [nonce, setNonce] = useState(0);
  const [viewport, setViewport] = useState<"mobile" | "desktop">("mobile");
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || viewport !== "desktop") return;

    function updateScale() {
      if (!container) return;
      setScale(container.clientWidth / DESKTOP_WIDTH);
    }
    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    return () => observer.disconnect();
  }, [viewport]);

  const src = `${origin}${path}`;

  return (
    <div className="sticky top-6 flex h-[calc(100vh-8rem)] min-h-[500px] flex-col overflow-hidden rounded-lg border bg-muted">
      <div className="flex items-center justify-between border-b bg-background px-3 py-2">
        <p className="truncate text-xs text-muted-foreground">Preview — {path}</p>
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("size-6", viewport === "mobile" && "bg-muted")}
              aria-label="Mobile view"
              aria-pressed={viewport === "mobile"}
              onClick={() => setViewport("mobile")}
            >
              <Smartphone className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("size-6", viewport === "desktop" && "bg-muted")}
              aria-label="Desktop view"
              aria-pressed={viewport === "desktop"}
              onClick={() => setViewport("desktop")}
            >
              <Monitor className="size-3.5" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Refresh preview"
            onClick={() => setNonce((n) => n + 1)}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden">
        {viewport === "mobile" ? (
          <iframe key={nonce} src={src} title="Site preview" className="size-full border-0 bg-white" />
        ) : (
          <iframe
            key={nonce}
            src={src}
            title="Site preview"
            className="border-0 bg-white"
            style={{
              width: DESKTOP_WIDTH,
              height: scale > 0 ? `${100 / scale}%` : "100%",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        )}
      </div>
    </div>
  );
}
