import { AuthAcceptInviteForm } from "@/components/auth-accept-invite-form";
import { findAppUserMembershipByInviteToken } from "@/lib/auth-access";
import { listCoachProfileRows, listManagerProfileRows, listPlayerRosterRows } from "@/lib/admin-repository";

function readToken(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const inviteToken = readToken(resolvedSearchParams.invite);

  if (!inviteToken) {
    return (
      <main className="page-shell auth-page-shell">
        <section className="panel-card auth-panel">
          <p className="eyebrow-label">Invite</p>
          <h1>Invalid Invite</h1>
          <p className="form-error">This invite link is missing the invite token.</p>
        </section>
      </main>
    );
  }

  const [membership, playerRows, coachRows, managerRows] = await Promise.all([
    findAppUserMembershipByInviteToken(inviteToken),
    listPlayerRosterRows(),
    listCoachProfileRows(),
    listManagerProfileRows(),
  ]);

  if (!membership || !membership.isActive) {
    return (
      <main className="page-shell auth-page-shell">
        <section className="panel-card auth-panel">
          <p className="eyebrow-label">Invite</p>
          <h1>Invite Not Found</h1>
          <p className="form-error">This invite link is invalid, expired, or already used.</p>
        </section>
      </main>
    );
  }

  const linkedLabel =
    membership.role === "player"
      ? playerRows.find((row) => row.id === membership.playerRosterMembershipId)?.name ?? "Player profile"
      : membership.role === "coach"
        ? coachRows.find((row) => row.id === membership.coachProfileId)?.fullName ?? "Coach profile"
        : membership.role === "manager"
          ? managerRows.find((row) => row.id === membership.managerProfileId)?.fullName ?? "Manager profile"
          : "Admin access";

  return (
    <main className="page-shell auth-page-shell">
      <section className="panel-card auth-panel">
        <p className="eyebrow-label">Invite</p>
        <h1>Create Your Login</h1>
        <p className="meta">
          This invite is linked to <strong>{linkedLabel}</strong> as a <strong>{membership.role}</strong>.
        </p>
        <p className="meta">
          Add the email you want to use for sign-in, then create your password.
        </p>
        <AuthAcceptInviteForm inviteToken={inviteToken} />
      </section>
    </main>
  );
}
