import type { TimelineEntry } from "@/lib/audit/activity";

const ACTION_LABELS: Record<string, string> = {
  contact_created: "Contact created",
  contact_updated: "Contact updated",
  contact_archived: "Contact archived",
  contact_unarchived: "Contact restored",
  contact_merged: "Merged another contact into this one",
  organization_created: "Organization created",
  organization_updated: "Organization updated",
  organization_archived: "Organization archived",
  organization_unarchived: "Organization restored",
  property_created: "Property created",
  property_updated: "Property updated",
  property_archived: "Property archived",
  property_unarchived: "Property restored",
  contact_attached_to_organization: "Added to organization",
  contact_detached_from_organization: "Removed from organization",
  contact_attached_to_property: "Added to property",
  contact_detached_from_property: "Removed from property",
  contact_property_role_updated: "Property role updated",
};

function humanizeAction(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id} className="border-l-2 border-border pl-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-foreground">{humanizeAction(entry.action)}</span>
            <span className="text-muted-foreground">
              {entry.actorName ?? "System"} · {formatTimestamp(entry.createdAt)}
            </span>
          </div>
          {entry.oldValue || entry.newValue ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {entry.oldValue ? `From: ${JSON.stringify(entry.oldValue)}` : null}
              {entry.oldValue && entry.newValue ? " — " : null}
              {entry.newValue ? `To: ${JSON.stringify(entry.newValue)}` : null}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
