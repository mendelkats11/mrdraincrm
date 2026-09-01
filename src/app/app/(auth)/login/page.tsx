import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/require-user";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; invite?: string }>;
}) {
  const session = await getCurrentSession();
  if (session) redirect("/");

  const params = await searchParams;
  const notice =
    params.reset === "success"
      ? "Password updated. Log in with your new password."
      : params.invite === "accepted"
        ? "Account created. Log in to continue."
        : undefined;

  return (
    <AuthShell>
      <LoginForm next={params.next} notice={notice} />
    </AuthShell>
  );
}
