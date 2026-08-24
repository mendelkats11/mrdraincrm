import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { listMessageThreads } from "@/lib/callrail/calls";
import { formatPhoneForDisplay } from "@/lib/phone";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationBar } from "@/components/pagination-bar";

const PAGE_SIZE = 50;
const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

// One row per sender (a real chat-app inbox, not a flat message log) —
// someone who texted a month ago and texts again today lands in the same
// thread, opened at /messages/[phoneNumberNormalized]. Receive/view only —
// outgoing SMS is intentionally excluded from V1 (docs/PROJECT_SPEC.md
// §16.4), so there's no reply composer here.
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const page = params.page ? Number(params.page) : 1;
  const { rows, total, pageSize } = await listMessageThreads(db, { page, pageSize: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Messages</h1>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No messages yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((thread) => (
            <Link key={thread.phoneNumberNormalized} href={`/messages/${thread.phoneNumberNormalized}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex flex-col gap-1 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {thread.contactName ?? formatPhoneForDisplay(thread.phoneNumber)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {DATE_FMT.format(thread.lastOccurredAt)}
                    </span>
                  </div>
                  <p className="truncate text-muted-foreground">{thread.lastBody ?? "(no text — photo/video)"}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <PaginationBar page={page} pageSize={pageSize} total={total} basePath="/messages" />
    </div>
  );
}
