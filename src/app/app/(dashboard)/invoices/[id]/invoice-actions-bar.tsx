"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markInvoiceSentAction, voidInvoiceAction } from "@/lib/invoices/invoice-actions";
import { resolveInvoiceRecipientEmail, sendInvoiceEmailAction } from "@/lib/invoices/invoice-email";
import type { InvoiceStatus } from "@/lib/invoices/invoices";
import { Button } from "@/components/ui/button";
import { SendEmailDialog } from "@/components/send-email-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// "Mark as Sent" is a manual, explicit action, deliberately decoupled from
// "Download PDF" (Phase 8 decision 6) — the owner may send the invoice
// however they like (attach the downloaded PDF to their own email, etc.)
// and this button is just how they record that it went out.
export function InvoiceActionsBar({
  invoiceId,
  jobId,
  status,
}: {
  invoiceId: string;
  jobId: string;
  status: InvoiceStatus;
}) {
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleMarkSent() {
    startTransition(async () => {
      const result = await markInvoiceSentAction(invoiceId, jobId);
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleVoid() {
    startTransition(async () => {
      const result = await voidInvoiceAction(invoiceId, jobId, voidReason);
      if (result?.ok) {
        setError(null);
        setVoidOpen(false);
        setVoidReason("");
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </Button>
        <SendEmailDialog
          entityId={invoiceId}
          idFieldName="invoiceId"
          triggerLabel="Send email"
          dialogTitle="Email this invoice"
          resolveDefaultEmail={resolveInvoiceRecipientEmail}
          action={sendInvoiceEmailAction}
        />
        {status === "draft" ? (
          <Button type="button" size="sm" disabled={pending} onClick={handleMarkSent}>
            Mark as Sent
          </Button>
        ) : null}
        {status !== "void" ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => setVoidOpen(true)}
          >
            Void
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice is kept permanently for your records but marked void and excluded from
              active totals. This cannot be undone — if you need to bill again, create a new
              invoice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voidReason">Reason</Label>
            <Textarea
              id="voidReason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={2}
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={pending || !voidReason.trim()} onClick={handleVoid}>
              Void invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
