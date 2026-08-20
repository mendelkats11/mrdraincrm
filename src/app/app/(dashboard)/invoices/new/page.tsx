import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getJob } from "@/lib/jobs/jobs";
import { resolveInvoiceDefaults } from "@/lib/invoices/invoices";
import { NewInvoiceForm } from "./new-invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const params = await searchParams;
  if (!params.jobId) notFound();
  const db = getDb();

  const [job, defaults] = await Promise.all([
    getJob(db, params.jobId),
    resolveInvoiceDefaults(db, params.jobId),
  ]);
  if (!job) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New invoice</h1>
        <p className="text-sm text-muted-foreground">For job {job.jobNumber}</p>
      </div>
      <NewInvoiceForm jobId={job.id} defaults={defaults} />
    </div>
  );
}
