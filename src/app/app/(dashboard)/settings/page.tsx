import { getDb } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/require-user";
import { getOwnerCallbackPhoneNumber } from "@/lib/callrail/callback";
import { DisplayNameForm } from "./display-name-form";
import { EmailForm } from "./email-form";
import { PasswordForm } from "./password-form";
import { CallbackPhoneForm } from "./callback-phone-form";

export default async function SettingsPage() {
  const session = await requireUser();
  const db = getDb();
  const callbackPhoneNumber = await getOwnerCallbackPhoneNumber(db);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account.</p>
      </div>

      <DisplayNameForm name={session.user.name} />
      <EmailForm email={session.user.email} />
      <PasswordForm />
      <CallbackPhoneForm phoneNumber={callbackPhoneNumber} />
    </div>
  );
}
