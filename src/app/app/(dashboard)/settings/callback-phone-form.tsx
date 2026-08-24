"use client";

import { useActionState } from "react";
import { updateCallbackPhoneAction } from "./callback-phone-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CallbackPhoneForm({ phoneNumber }: { phoneNumber: string | null }) {
  const [state, formAction, pending] = useActionState(updateCallbackPhoneAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Call back number</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phoneNumber">Your phone</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={phoneNumber ?? ""}
              placeholder="e.g. (306) 555-1234"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            When you click &quot;Call back&quot; on a missed call, CallRail dials this number first
            — once you answer, it connects you to the customer.
          </p>
          {state && !state.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
