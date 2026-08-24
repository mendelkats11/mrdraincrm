import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getCall, listJobsForContact } from "@/lib/callrail/calls";
import { getEntityTimeline } from "@/lib/audit/activity";
import { formatPhoneForDisplay } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CallDirectionIcon } from "@/components/call-direction-icon";
import { CallBackButton } from "./call-back-button";
import { UnknownCallerActions } from "./unknown-caller-actions";

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" });

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const call = await getCall(db, id);
  if (!call) notFound();

  const [timeline, previousJobs] = await Promise.all([
    getEntityTimeline(db, "call", id),
    call.contactId ? listJobsForContact(db, call.contactId) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <CallDirectionIcon direction={call.direction} />
            {call.contactName ?? formatPhoneForDisplay(call.callerNumber)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatPhoneForDisplay(call.callerNumber)}
          </p>
        </div>
        {call.direction === "inbound" ? (
          <CallBackButton
            callId={call.id}
            callerNumber={formatPhoneForDisplay(call.callerNumber)}
          />
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>
            Direction: <span className="text-muted-foreground capitalize">{call.direction}</span>
          </p>
          <p>
            Tracking number: <span className="text-muted-foreground">{call.trackingNumber}</span>
          </p>
          <p>
            Service area:{" "}
            <span className="text-muted-foreground">{call.serviceAreaName ?? "—"}</span>
          </p>
          <p>
            Answered:{" "}
            <span className="text-muted-foreground">{call.answered ? "Yes" : "Missed"}</span>
          </p>
          <p>
            Duration:{" "}
            <span className="text-muted-foreground">{formatDuration(call.durationSeconds)}</span>
          </p>
          <p>
            Date: <span className="text-muted-foreground">{DATE_FMT.format(call.occurredAt)}</span>
          </p>
        </CardContent>
      </Card>

      {call.contactId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Known caller</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/contacts/${call.contactId}`}>View Contact</Link>
              </Button>
              <Button asChild variant="outline">
                {/* The Leads dialog doesn't support a contactId prefill
                    today (neither does anywhere else in the app, including
                    the Contact page itself) — search for the contact by
                    name/phone inside it, same as creating any other lead. */}
                <Link href="/leads">Create Lead</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/jobs/new?contactId=${call.contactId}`}>Create Job</Link>
              </Button>
            </div>
            {previousJobs.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">Previous jobs</h3>
                <ul className="flex flex-col gap-1">
                  {previousJobs.map((job) => (
                    <li key={job.id} className="text-sm">
                      <Link href={`/jobs/${job.id}`} className="hover:underline">
                        {job.jobNumber}
                      </Link>
                      <span className="ml-2 text-muted-foreground capitalize">{job.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No previous jobs.</p>
            )}
          </CardContent>
        </Card>
      ) : call.ignored ? null : (
        <UnknownCallerActions
          callId={call.id}
          suggestedName={formatPhoneForDisplay(call.callerNumber)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline entries={timeline} />
        </CardContent>
      </Card>
    </div>
  );
}
