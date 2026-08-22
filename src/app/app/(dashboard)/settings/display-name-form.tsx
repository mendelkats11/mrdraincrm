"use client";

import { useActionState } from "react";
import { updateDisplayNameAction } from "@/lib/auth/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DisplayNameForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(updateDisplayNameAction, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Display name</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={name} required maxLength={200} />
          </div>
          {state && !state.ok ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? <p className="text-sm text-muted-foreground">Saved.</p> : null}
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
