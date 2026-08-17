import { getDb } from "@/lib/db/client";
import { findDuplicateContacts } from "@/lib/crm/duplicates";
import { Badge } from "@/components/ui/badge";
import { MergeContactDialog } from "./merge-contact-dialog";

const REASON_LABELS: Record<string, string> = {
  phone: "Same phone",
  email: "Same email",
  similar_name: "Similar name",
};

// Recomputed on every view, nothing persisted — see src/lib/crm/duplicates.ts.
// Purely a suggestion; merging always requires an explicit confirmation
// (MergeContactDialog), never automatic.
export async function DuplicatesSection({
  contact,
}: {
  contact: { id: string; displayName: string };
}) {
  const db = getDb();
  const candidates = await findDuplicateContacts(db, contact.id);

  if (candidates.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
      <h2 className="text-sm font-medium text-foreground">Possible duplicates</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {candidates.map((candidate) => (
          <li
            key={candidate.contactId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background p-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{candidate.displayName}</span>
              {candidate.matchReasons.map((reason) => (
                <Badge key={reason} variant="secondary">
                  {REASON_LABELS[reason] ?? reason}
                </Badge>
              ))}
            </div>
            <MergeContactDialog
              contact={contact}
              initialTarget={{ id: candidate.contactId, displayName: candidate.displayName }}
              trigger={
                <button type="button" className="text-sm font-medium text-primary hover:underline">
                  Merge
                </button>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
