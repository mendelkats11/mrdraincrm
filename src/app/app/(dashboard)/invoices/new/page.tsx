import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { getJob } from "@/lib/jobs/jobs";
import { resolveInvoiceDefaults } from "@/lib/invoices/invoices";
import { getStorageProvider } from "@/lib/storage";
import { resolveLogoUrl } from "@/lib/pdf/logo";
import { NewInvoiceForm } from "./new-invoice-form";

// Two entry points share this page: from a job's page (?jobId=… — the
// invoice is attached to that existing job) and "+ New Invoice" from
// /invoices with no jobId — createInvoiceFromScratch then creates a
// minimal job underneath automatically (see its own comment for why).
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();

  if (params.jobId) {
    const [job, defaults] = await Promise.all([
      getJob(db, params.jobId),
      resolveInvoiceDefaults(db, params.jobId),
    ]);
    if (!job) notFound();
    const logoUrl = await resolveDefaultsLogoUrl(defaults.logoKey);

    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">New invoice</h1>
          <p className="text-sm text-muted-foreground">For job {job.jobNumber}</p>
        </div>
        <NewInvoiceForm
          jobId={job.id}
          jobNumber={job.jobNumber}
          defaults={defaults}
          logoUrl={logoUrl}
        />
      </div>
    );
  }

  const defaults = await resolveInvoiceDefaults(db);
  const logoUrl = await resolveDefaultsLogoUrl(defaults.logoKey);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New invoice</h1>
        <p className="text-sm text-muted-foreground">
          Creates a new job behind the scenes to hold this invoice — you can attach a contact or
          property below.
        </p>
      </div>
      <NewInvoiceForm defaults={defaults} logoUrl={logoUrl} />
    </div>
  );
}

async function resolveDefaultsLogoUrl(logoKey: string | null): Promise<string | null> {
  if (!logoKey) return null;
  try {
    return await resolveLogoUrl(getStorageProvider(), logoKey);
  } catch {
    return null;
  }
}
