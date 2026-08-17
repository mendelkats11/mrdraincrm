import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/jobs/jobs";

export const STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  open: "Open",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<JobStatus, "default" | "secondary" | "outline"> = {
  draft: "outline",
  open: "outline",
  scheduled: "outline",
  in_progress: "outline",
  completed: "default",
  cancelled: "secondary",
};

// Status is communicated by text + color, never color alone —
// docs/DESIGN_SYSTEM.md §13.
export function StatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
