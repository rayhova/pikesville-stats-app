"use server";

import { completeAppUserMembershipInvite } from "@/lib/auth-access";

export interface AcceptInviteState {
  error?: string;
  success?: boolean;
  email?: string;
}

export async function completeProfileInviteAction(
  _previousState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const inviteToken = String(formData.get("inviteToken") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!inviteToken) {
    return { error: "This invite link is missing its token." };
  }

  if (!email) {
    return { error: "Enter an email address to claim this invite." };
  }

  if (password.length < 8) {
    return { error: "Use at least 8 characters for the password." };
  }

  try {
    const result = await completeAppUserMembershipInvite({
      inviteToken,
      email,
      password,
    });

    return {
      success: true,
      email: result.email,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to complete invite.",
    };
  }
}
