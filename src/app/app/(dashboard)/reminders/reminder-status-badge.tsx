import { Badge } from "@/components/ui/badge";
import { classifyReminderTiming } from "@/lib/reminders/status";

export function ReminderStatusBadge({
  dueAt,
  completedAt,
  cancelledAt,
  now = new Date(),
}: {
  dueAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  now?: Date;
}) {
  if (completedAt) return <Badge variant="success">Completed</Badge>;
  if (cancelledAt) return <Badge variant="secondary">Hidden</Badge>;

  const timing = classifyReminderTiming(dueAt, now);
  if (timing === "overdue") return <Badge variant="destructive">Overdue</Badge>;
  if (timing === "due_today") return <Badge variant="warning">Due today</Badge>;
  return <Badge variant="info">Upcoming</Badge>;
}
