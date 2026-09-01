import { AuthShell } from "../../auth-shell";
import { AcceptInviteForm } from "./accept-invite-form";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthShell>
      <AcceptInviteForm token={token} />
    </AuthShell>
  );
}
