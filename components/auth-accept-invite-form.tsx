"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeProfileInviteAction, type AcceptInviteState } from "@/app/auth/accept/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const initialState: AcceptInviteState = {};

export function AuthAcceptInviteForm({
  inviteToken,
}: Readonly<{
  inviteToken: string;
}>) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(completeProfileInviteAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isSigningIn, startTransition] = useTransition();

  useEffect(() => {
    if (!state.success || !state.email) {
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: state.email!,
        password,
      });

      if (error) {
        setClientError(error.message);
        return;
      }

      router.push("/");
      router.refresh();
    });
  }, [password, router, state.email, state.success]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    setClientError(null);

    if (password !== confirmPassword) {
      event.preventDefault();
      setClientError("Passwords do not match.");
      return;
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="form-grid">
      <input type="hidden" name="inviteToken" value={inviteToken} />
      <div className="field-group field-span-2">
        <label htmlFor="accept-invite-email">Email</label>
        <input
          id="accept-invite-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor="accept-invite-password">Password</label>
        <input
          id="accept-invite-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor="accept-invite-confirm-password">Confirm Password</label>
        <input
          id="accept-invite-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>
      {clientError ? <p className="form-error field-span-2">{clientError}</p> : null}
      {state.error ? <p className="form-error field-span-2">{state.error}</p> : null}
      {state.success ? <p className="form-success field-span-2">Account created. Signing you in...</p> : null}
      <div className="action-row field-span-2 auth-form-actions">
        <button className="button-link" type="submit" disabled={isPending || isSigningIn}>
          {isPending || isSigningIn ? "Finishing Setup..." : "Create Account"}
        </button>
      </div>
    </form>
  );
}
