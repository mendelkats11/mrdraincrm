"use client";

import { useState, useTransition } from "react";
import { PhoneCall } from "lucide-react";
import { callBackAction } from "@/lib/callrail/call-actions";
import { Button } from "@/components/ui/button";

/**
 * Places a real outbound phone call the moment it's confirmed — CallRail
 * dials the owner first, then bridges to the customer using the original
 * tracking number as caller ID (src/lib/callrail/callback.ts). A plain
 * confirm() is enough friction for a same-owner action with no destructive
 * data risk, but "this will call them right now" is worth one extra click
 * given it has a real-world, non-undoable effect.
 */
export function CallBackButton({ callId, callerNumber }: { callId: string; callerNumber: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Call ${callerNumber} back now? Your phone will ring first.`)) return;
    startTransition(async () => {
      const result = await callBackAction(callId);
      if (result?.ok) {
        setError(null);
        setDone(true);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" onClick={handleClick} disabled={pending || done}>
        <PhoneCall className="size-4" />
        {pending ? "Calling…" : done ? "Calling your phone…" : "Call back"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
