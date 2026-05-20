import { AuthResetPasswordForm } from "@/components/auth-reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="page-shell auth-page-shell">
      <section className="panel-card auth-panel">
        <p className="eyebrow-label">Account Recovery</p>
        <h1>Reset Password</h1>
        <p className="meta">
          Send yourself a password reset link. On the built-in Supabase email provider this is low-volume, so use it for occasional resets.
        </p>
        <AuthResetPasswordForm />
      </section>
    </main>
  );
}
