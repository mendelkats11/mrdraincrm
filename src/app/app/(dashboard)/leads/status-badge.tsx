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

const STATUS_VARIANTS: Record<
  LeadStatus,
  "outline" | "info" | "warning" | "success" | "secondary"
> = {
  new: "outline",
  contacted: "info",
  quoted: "info",
  follow_up: "warning",
  won: "success",
  lost: "secondary",
};

// Status is communicated by text + color, never color alone —
// docs/DESIGN_SYSTEM.md §13.
export function StatusBadge({ status }: { status: LeadStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
