"use client";

import { useActionState, useEffect } from "react";
import { logoutAction, logoutAllDevicesAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

function useRedirectOnAction(action: () => Promise<{ redirectTo: string } | undefined>) {
  const [state, formAction, pending] = useActionState(async () => action(), undefined);

  // Full navigation, not a soft client-side transition — see the comment
  // on logoutAction in src/lib/auth/actions.ts for why that matters here.
  useEffect(() => {
    if (state?.redirectTo) {
      window.location.href = state.redirectTo;
    }
  }, [state?.redirectTo]);

  return { formAction, pending };
}

export function LogoutButtons() {
  const logout = useRedirectOnAction(logoutAction);
  const logoutAll = useRedirectOnAction(logoutAllDevicesAction);

  return (
    <div className="flex gap-2">
      <form action={logout.formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={logout.pending}>
          Log out
        </Button>
      </form>
      <form action={logoutAll.formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={logoutAll.pending}>
          Log out all devices
        </Button>
      </form>
    </div>
  );
}
