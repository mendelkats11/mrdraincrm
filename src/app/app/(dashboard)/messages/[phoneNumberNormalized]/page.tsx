import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { listMessagesForThread } from "@/lib/callrail/calls";
import { formatPhoneForDisplay } from "@/lib/phone";
import { Card, CardContent } from "@/components/ui/card";

const TIME_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ phoneNumberNormalized: string }>;
}) {
  const { phoneNumberNormalized } = await params;
  const db = getDb();
  const thread = await listMessagesForThread(db, phoneNumberNormalized);
  if (thread.length === 0) notFound();

  const first = thread[0]!;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Link href="/messages" className="text-sm text-muted-foreground hover:underline">
          ← All messages
        </Link>
        <h1 className="text-xl font-semibold text-foreground">
          {first.contactId ? (
            <Link href={`/contacts/${first.contactId}`} className="hover:underline">
              {formatPhoneForDisplay(first.phoneNumber)}
            </Link>
          ) : (
            formatPhoneForDisplay(first.phoneNumber)
          )}
        </h1>
        <p className="text-sm text-muted-foreground">{thread.length} messages</p>
      </div>

      <div className="flex flex-col gap-3">
        {thread.map((message) => (
          <div key={message.id} className="flex flex-col items-start gap-1">
            <Card className="max-w-[85%] bg-muted">
              <CardContent className="flex flex-col gap-2 px-3 py-2 text-sm">
                {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}
                {message.mediaUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {message.mediaUrls.map((_url, index) => (
                      // eslint-disable-next-line @next/next/no-img-element -- proxied CallRail MMS attachment, not a static/optimizable asset (see the route's own comment on why it can't be a signed public URL)
                      <img
                        key={index}
                        src={`/api/callrail-media/${message.id}/${index}`}
                        alt="MMS attachment"
                        className="max-h-64 max-w-full rounded-md border object-contain"
                      />
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <span className="px-1 text-xs text-muted-foreground">
              {TIME_FMT.format(message.occurredAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
