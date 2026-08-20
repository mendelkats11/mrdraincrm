import { getDb } from "@/lib/db/client";
import { listMessages } from "@/lib/callrail/calls";
import { formatPhoneForDisplay } from "@/lib/phone";
import { Card, CardContent } from "@/components/ui/card";

const PAGE_SIZE = 25;
const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

// Receive/view only — outgoing SMS is intentionally excluded from V1
// (docs/PROJECT_SPEC.md §16.4), so there's no reply composer here.
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const { rows, total } = await listMessages(db, {
    page: params.page ? Number(params.page) : 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Messages</h1>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No messages yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((message) => (
            <Card key={message.id}>
              <CardContent className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {message.contactName ?? formatPhoneForDisplay(message.phoneNumber)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {DATE_FMT.format(message.occurredAt)}
                  </span>
                </div>
                {message.body ? <p className="text-muted-foreground">{message.body}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > PAGE_SIZE ? (
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {total}
        </p>
      ) : null}
    </div>
  );
}
