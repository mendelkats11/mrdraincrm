// Stable widget ids — persisted in user_preferences.dashboard_widget_order/
// _hidden (src/lib/db/schema/system.ts), so these strings are effectively a
// public interface: renaming one silently orphans every saved preference
// (applyOrderAndVisibility just falls back to appending it as "new," which
// is safe but loses the user's chosen position).
export const OPERATIONS_WIDGET_IDS = [
  "todays_jobs",
  "new_leads",
  "open_jobs",
  "emergency_requests",
  "overdue_reminders",
  "outstanding_invoices",
  "contractor_payouts_pending",
  "recent_activity",
] as const;

export type OperationsWidgetId = (typeof OPERATIONS_WIDGET_IDS)[number];

export const OPERATIONS_WIDGET_LABELS: Record<OperationsWidgetId, string> = {
  todays_jobs: "Today's Jobs",
  new_leads: "New Leads",
  open_jobs: "Open Jobs",
  emergency_requests: "Emergency Requests",
  overdue_reminders: "Overdue Reminders",
  outstanding_invoices: "Outstanding Invoices",
  contractor_payouts_pending: "Contractor Payouts Pending",
  recent_activity: "Recent Activity",
};

/** "Today's Jobs" satisfies docs/PROJECT_SPEC.md §21's "Today's schedule
 *  should be visible" — a firm requirement, not one of the "such as"
 *  configurable widgets, so it can be reordered but never hidden. */
export const ALWAYS_VISIBLE_OPERATIONS_WIDGETS: readonly OperationsWidgetId[] = ["todays_jobs"];
