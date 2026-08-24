import { PhoneIncoming, PhoneOutgoing } from "lucide-react";

/** Inbound = the customer called us (the overwhelming majority); outbound = we called them (e.g. the "Call back" feature). */
export function CallDirectionIcon({ direction }: { direction: string }) {
  if (direction === "outbound") {
    return (
      <span title="Outbound call">
        <PhoneOutgoing className="size-4 text-info" aria-label="Outbound call" />
      </span>
    );
  }
  return (
    <span title="Inbound call">
      <PhoneIncoming className="size-4 text-success" aria-label="Inbound call" />
    </span>
  );
}
