import { redirect } from "next/navigation";
import { AuthLoginForm } from "@/components/auth-login-form";
import { getAccessSession } from "@/lib/access-control";

export default async function LoginPage() {
  const session = await getAccessSession();

  if (session.authSource === "supabase" && session.role) {
    redirect("/");
  }

  return (
    <main className="page-shell auth-page-shell">
      <section className="panel-card auth-panel">
        <p className="eyebrow-label">Pikesville Basketball</p>
        <h1>Sign In</h1>
        <p className="meta">
          Sign in with the email and password attached to your player, coach, manager, or admin access.
        </p>
        <AuthLoginForm />
      </section>
    </main>
  );
}
