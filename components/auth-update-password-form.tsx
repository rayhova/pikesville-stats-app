"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthUpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 8) {
      setErrorMessage("Use at least 8 characters for the new password.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Password updated. Redirecting to Program Hub...");
    window.setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 800);
  }

  if (hasSession === false) {
    return (
      <p className="form-error">
        No active recovery or invite session was found. Open your invite or reset link again.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="field-group field-span-2">
        <label htmlFor="new-password">New Password</label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="field-group field-span-2">
        <label htmlFor="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      {errorMessage ? <p className="form-error field-span-2">{errorMessage}</p> : null}
      {successMessage ? <p className="form-success field-span-2">{successMessage}</p> : null}
      <div className="action-row field-span-2 auth-form-actions">
        <button className="button-link" type="submit" disabled={isSubmitting || hasSession === null}>
          {isSubmitting ? "Saving..." : "Set Password"}
        </button>
      </div>
    </form>
  );
}
