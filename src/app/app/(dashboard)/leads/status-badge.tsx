import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/crm/leads";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  follow_up: "Follow Up",
  won: "Won",
  lost: "Lost",
};

const STATUS_VARIANTS: Record<LeadStatus, "default" | "secondary" | "outline"> = {
  new: "outline",
  contacted: "outline",
  quoted: "outline",
  follow_up: "outline",
  won: "default",
  lost: "secondary",
};

// Status is communicated by text + color, never color alone —
// docs/DESIGN_SYSTEM.md §13.
export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
