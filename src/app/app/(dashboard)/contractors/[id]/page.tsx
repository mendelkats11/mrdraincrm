import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getContractor } from "@/lib/contractors/contractors";
import { getContractorStats, listJobsForContractor } from "@/lib/contractors/assignments";
import { getEntityTimeline } from "@/lib/audit/activity";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityTimeline } from "@/components/activity-timeline";
import { BackLink } from "@/components/back-link";
import { EditContractorDialog } from "./edit-contractor-dialog";
import { ActiveToggle } from "./active-toggle";
import { PayoutHistory } from "./payout-history";

const DATE_FMT = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const contractor = await getContractor(db, id);
  if (!contractor) notFound();

  const [stats, jobs, timeline] = await Promise.all([
    getContractorStats(db, id),
    listJobsForContractor(db, id),
    getEntityTimeline(db, "contractor", id),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <BackLink href="/contractors" label="Back to Contractors" />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            {contractor.name}
            {contractor.active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Added {DATE_FMT.format(contractor.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <EditContractorDialog contractor={contractor} />
          <ActiveToggle contractorId={contractor.id} active={contractor.active} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jobs Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.jobsCompleted}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Job Value
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCents(stats.totalJobValueCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payout
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCents(stats.totalPayoutCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Payout
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCents(stats.outstandingPayoutCents)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p>Phone: {contractor.phone ? formatPhoneForDisplay(contractor.phone) : "—"}</p>
          <p>Email: {contractor.email ?? "—"}</p>
          <p>Default payout arrangement: {contractor.defaultPayoutArrangement ?? "—"}</p>
          {contractor.notes ? (
            <p className="whitespace-pre-wrap">Notes: {contractor.notes}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutHistory jobs={jobs} />
        </CardContent>
      </Card>

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
