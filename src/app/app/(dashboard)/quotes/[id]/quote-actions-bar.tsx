"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelQuoteAction,
  convertQuoteToJobAction,
  markQuoteAcceptedAction,
  markQuoteDeclinedAction,
  markQuoteSentAction,
} from "@/lib/quotes/quote-actions";
import { resolveQuoteRecipientEmail, sendQuoteEmailAction } from "@/lib/quotes/quote-email";
import type { QuoteStatus } from "@/lib/quotes/quotes";
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

// "Mark as Sent" is a manual, explicit action, deliberately decoupled from
// "Download PDF" — the owner may send the quote however they like (attach
// the downloaded PDF to their own email, etc.) and this button is just how
// they record that it went out. Mirrors Phase 8's invoice behavior exactly.
export function QuoteActionsBar({
  quoteId,
  status,
  convertedJobId,
}: {
  quoteId: string;
  status: QuoteStatus;
  convertedJobId: string | null;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function runAction(
    action: () => Promise<{ ok: true } | { ok: false; error: string } | undefined>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result?.ok) {
        setError(null);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelQuoteAction(quoteId);
      if (result?.ok) {
        setError(null);
        setCancelOpen(false);
        router.refresh();
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  function handleConvert() {
    startTransition(async () => {
      const result = await convertQuoteToJobAction(quoteId);
      if (result?.ok) {
        setConvertOpen(false);
        router.push(`/jobs/${result.jobId}`);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  const canMarkSent = status === "draft";
  const canMarkAccepted = status === "sent";
  const canMarkDeclined = status === "sent" || status === "accepted";
  const canCancel = status === "draft" || status === "sent" || status === "accepted";
  const canConvert = status === "accepted" && !convertedJobId;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </Button>
        <SendEmailDialog
          entityId={quoteId}
          idFieldName="quoteId"
          triggerLabel="Send email"
          dialogTitle="Email this quote"
          resolveDefaultEmail={resolveQuoteRecipientEmail}
          action={sendQuoteEmailAction}
        />
        {canMarkSent ? (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => runAction(() => markQuoteSentAction(quoteId))}
          >
            Mark as Sent
          </Button>
        ) : null}
        {canMarkAccepted ? (
          <Button
            type="button"
            variant="success"
            size="sm"
            disabled={pending}
            onClick={() => runAction(() => markQuoteAcceptedAction(quoteId))}
          >
            Mark as Accepted
          </Button>
        ) : null}
        {canMarkDeclined ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => runAction(() => markQuoteDeclinedAction(quoteId))}
          >
            Mark as Declined
          </Button>
        ) : null}
        {canConvert ? (
          <Button
            type="button"
            variant="success"
            size="sm"
            disabled={pending}
            onClick={() => setConvertOpen(true)}
          >
            Convert to Job
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => setCancelOpen(true)}
          >
            Cancel
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this quote?</AlertDialogTitle>
            <AlertDialogDescription>
              The quote is kept permanently for your records but marked cancelled and excluded from
              active totals. This cannot be undone — if you need to quote again, create a new quote.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep quote</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={handleCancel}>
              Cancel quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert this quote into a job?</AlertDialogTitle>
            <AlertDialogDescription>
              Creates a new job carrying over the contact, property, and description from this
              quote. The job&apos;s own financial fields (job amount, materials, contractor payout)
              are entered separately afterward — they&apos;re never copied from the quote total.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="success" disabled={pending} onClick={handleConvert}>
              Convert to job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
