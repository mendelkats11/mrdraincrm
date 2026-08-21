"use client";

import { useActionState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { updateReportingSettingsAction } from "@/lib/reports/reporting-settings-actions";

export function ReportingSettingsToggle({ includeTaxInRevenue }: { includeTaxInRevenue: boolean }) {
  const [state, formAction, pending] = useActionState(updateReportingSettingsAction, undefined);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
    >
      <label className="flex items-center gap-2">
        <Checkbox
          id="includeTaxInRevenue"
          name="includeTaxInRevenue"
          defaultChecked={includeTaxInRevenue}
        />
        Include tax in revenue/profit calculations
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      {state?.ok ? <span className="text-xs text-muted-foreground">Saved.</span> : null}
    </form>
  );
}
