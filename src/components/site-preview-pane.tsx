"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTO_REFRESH_MS = 4000;

/**
 * Embeds the real public page for the section currently being edited, so a
 * save's effect is visible without leaving the admin screen (docs feature
 * request: "add a preview of what it currently looks like, and it should be
 * live"). This is the actual live site, not a re-implementation — it can
 * only reflect what's already been saved (Website CMS pages don't hold
 * unsaved draft state the way the invoice/quote forms' client-side preview
 * does), so it polls on an interval and refreshes immediately whenever the
 * tab regains focus, which covers the common "save, glance at the preview"
 * loop with only a few seconds of lag.
 *
 * Framing is only possible because next.config.ts grants the app's own
 * origin (and only that origin) an exception to the public site's normal
 * frame-ancestors 'none' — see the comment there.
 */
export function SitePreviewPane({ origin, path }: { origin: string; path: string }) {
  const [nonce, setNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNonce((n) => n + 1), AUTO_REFRESH_MS);
    function onFocus() {
      setNonce((n) => n + 1);
    }
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const src = `${origin}${path}`;

  return (
    <div className="sticky top-6 flex h-[calc(100vh-8rem)] min-h-[500px] flex-col overflow-hidden rounded-lg border bg-muted">
      <div className="flex items-center justify-between border-b bg-background px-3 py-2">
        <p className="truncate text-xs text-muted-foreground">Live preview — {path}</p>
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
      <iframe
        ref={iframeRef}
        key={nonce}
        src={src}
        title="Site preview"
        className="w-full flex-1 border-0 bg-white"
      />
    </div>
  );
}
