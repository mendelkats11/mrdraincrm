"use client";

import { useActionState, useEffect } from "react";
import { changePasswordAction } from "@/lib/auth/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, undefined);

  // Full navigation, not a soft client-side transition — changing the
  // password revokes every session including this one (src/lib/auth/
  // account.ts), so the client must actually reload against /login rather
  // than keep rendering a page built on a session that no longer exists.
  useEffect(() => {
    if (state?.ok) {
      window.location.href = state.redirectTo;
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {state && !state.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Changing your password signs you out everywhere, including this device — you&apos;ll
            need to log back in.
          </p>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Change password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
