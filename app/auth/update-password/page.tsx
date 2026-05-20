import { AuthUpdatePasswordForm } from "@/components/auth-update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="page-shell auth-page-shell">
      <section className="panel-card auth-panel">
        <p className="eyebrow-label">Account Setup</p>
        <h1>Set Password</h1>
        <p className="meta">
          Finish your invite or recovery flow by setting a new password for this account.
        </p>
        <AuthUpdatePasswordForm />
      </section>
    </main>
  );
}
