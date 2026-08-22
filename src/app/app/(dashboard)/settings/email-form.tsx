"use client";

import { useActionState } from "react";
import { updateEmailAction } from "@/lib/auth/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmailForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(updateEmailAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email address</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Current: {email}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newEmail">New email</Label>
            <Input id="newEmail" name="newEmail" type="email" required maxLength={320} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPasswordForEmail">Current password</Label>
            <Input
              id="currentPasswordForEmail"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {state && !state.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Update email"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
