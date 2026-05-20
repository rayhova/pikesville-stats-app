import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/access-config";
import type { AppUserMembershipRecord } from "@/lib/admin-domain";
import { getPersistenceMode } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface AppUserMembershipRow {
  id: string;
  email: string | null;
  auth_user_id: string | null;
  role: AppRole;
  player_roster_membership_id: string | null;
  coach_profile_id: string | null;
  manager_profile_id: string | null;
  is_active: boolean;
  invite_link: string | null;
  invite_generated_at: string | null;
  invite_expires_at: string | null;
  invite_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppUserMembershipSummaryRow extends AppUserMembershipRecord {
  status: "pending_invite" | "active" | "inactive";
}

function normalizeMembershipRow(row: AppUserMembershipRow): AppUserMembershipRecord {
  return {
    id: row.id,
    email: row.email ?? undefined,
    authUserId: row.auth_user_id ?? undefined,
    role: row.role,
    playerRosterMembershipId: row.player_roster_membership_id ?? undefined,
    coachProfileId: row.coach_profile_id ?? undefined,
    managerProfileId: row.manager_profile_id ?? undefined,
    isActive: row.is_active,
    inviteLink: row.invite_link ?? undefined,
    inviteGeneratedAt: row.invite_generated_at ?? undefined,
    inviteExpiresAt: row.invite_expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSummaryRow(record: AppUserMembershipRecord): AppUserMembershipSummaryRow {
  return {
    ...record,
    status: !record.isActive
      ? "inactive"
      : record.authUserId
        ? "active"
        : "pending_invite",
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listAppUserMembershipRows() {
  if (getPersistenceMode() === "mock") {
    return [] as AppUserMembershipSummaryRow[];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_user_memberships")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Unable to load access memberships: ${error.message}`);
  }

  return ((data ?? []) as AppUserMembershipRow[]).map(normalizeMembershipRow).map(toSummaryRow);
}

export async function createAppUserMembership(input: {
  email?: string;
  role: AppRole;
  playerRosterMembershipId?: string;
  coachProfileId?: string;
  managerProfileId?: string;
}) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Access membership management requires Supabase.");
  }

  const supabase = getSupabaseAdminClient();
  const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
  const payload = {
    email: normalizedEmail,
    role: input.role,
    player_roster_membership_id: input.playerRosterMembershipId || null,
    coach_profile_id: input.coachProfileId || null,
    manager_profile_id: input.managerProfileId || null,
    is_active: true,
  };

  const findByField = async (field: string, value: string | null) => {
    if (!value) {
      return null;
    }

    const { data, error } = await supabase
      .from("app_user_memberships")
      .select("*")
      .eq(field, value)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to load access membership: ${error.message}`);
    }

    return (data as AppUserMembershipRow | null) ?? null;
  };

  const [emailMatch, playerMatch, coachMatch, managerMatch] = await Promise.all([
    findByField("email", normalizedEmail),
    findByField("player_roster_membership_id", payload.player_roster_membership_id),
    findByField("coach_profile_id", payload.coach_profile_id),
    findByField("manager_profile_id", payload.manager_profile_id),
  ]);

  const existingMatches = [emailMatch, playerMatch, coachMatch, managerMatch].filter(
    (row, index, rows): row is AppUserMembershipRow => Boolean(row) && rows.findIndex((candidate) => candidate?.id === row?.id) === index,
  );

  if (existingMatches.length > 1) {
    throw new Error("Unable to create access membership: conflicting existing access records found. Please delete the stale invite first.");
  }

  const existingRow = existingMatches[0] ?? null;

  if (existingRow) {
    const { data, error } = await supabase
      .from("app_user_memberships")
      .update({
        ...payload,
        email: normalizedEmail ?? existingRow.email ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRow.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Unable to update access membership: ${error.message}`);
    }

    return normalizeMembershipRow(data as AppUserMembershipRow);
  }

  const { data, error } = await supabase
    .from("app_user_memberships")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to create access membership: ${error.message}`);
  }

  return normalizeMembershipRow(data as AppUserMembershipRow);
}

export async function deleteAppUserMembership(membershipId: string) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Access membership management requires Supabase.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("app_user_memberships").delete().eq("id", membershipId);

  if (error) {
    throw new Error(`Unable to delete access membership: ${error.message}`);
  }
}

export async function clearAppUserMembershipAuthLink(membershipId: string) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Access membership management requires Supabase.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("app_user_memberships")
    .update({
      auth_user_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  if (error) {
    throw new Error(`Unable to clear auth link: ${error.message}`);
  }
}

export async function generateAppUserInviteLink(membershipId: string, baseUrl: string) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Invite links require Supabase.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: membershipData, error: membershipError } = await supabase
    .from("app_user_memberships")
    .select("*")
    .eq("id", membershipId)
    .single();

  if (membershipError || !membershipData) {
    throw new Error(`Unable to find access membership: ${membershipError?.message ?? "Missing row"}`);
  }

  const membership = normalizeMembershipRow(membershipData as AppUserMembershipRow);
  const generatedAt = new Date().toISOString();

  if (membership.role !== "admin") {
    const inviteToken = crypto.randomUUID();
    const inviteLink = new URL("/auth/accept", baseUrl);
    inviteLink.searchParams.set("invite", inviteToken);

    const { error: updateError } = await supabase
      .from("app_user_memberships")
      .update({
        invite_link: inviteLink.toString(),
        invite_generated_at: generatedAt,
        invite_expires_at: null,
        invite_token: inviteToken,
        updated_at: generatedAt,
      })
      .eq("id", membershipId);

    if (updateError) {
      throw new Error(`Unable to save invite link: ${updateError.message}`);
    }

    return inviteLink.toString();
  }

  if (!membership.email) {
    throw new Error("Admin invites still require an email address.");
  }

  const linkOptions = {
    data: {
      membershipId: membership.id,
      role: membership.role,
      playerRosterMembershipId: membership.playerRosterMembershipId ?? null,
      coachProfileId: membership.coachProfileId ?? null,
      managerProfileId: membership.managerProfileId ?? null,
    },
  };
  let { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: membership.email,
    options: linkOptions,
  });

  if (error && /registered|already been registered|already exists/i.test(error.message)) {
    const recoveryResult = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: membership.email,
      options: {
        redirectTo: new URL("/auth/update-password", baseUrl).toString(),
      },
    });
    data = recoveryResult.data;
    error = recoveryResult.error;
  }

  if (error || !data.properties) {
    throw new Error(`Unable to generate invite link: ${error?.message ?? "Missing link"}`);
  }

  const inviteLink = new URL("/auth/confirm", baseUrl);
  inviteLink.searchParams.set("token_hash", data.properties.hashed_token);
  inviteLink.searchParams.set("type", data.properties.verification_type);
  inviteLink.searchParams.set("next", "/auth/update-password");

  if (data.user?.id) {
    const existingMetadata =
      typeof data.user.user_metadata === "object" && data.user.user_metadata !== null
        ? data.user.user_metadata
        : {};
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        ...existingMetadata,
        membershipId: membership.id,
        role: membership.role,
        playerRosterMembershipId: membership.playerRosterMembershipId ?? null,
        coachProfileId: membership.coachProfileId ?? null,
        managerProfileId: membership.managerProfileId ?? null,
      },
    });

    if (updateAuthError) {
      throw new Error(`Unable to sync auth profile metadata: ${updateAuthError.message}`);
    }
  }

  const { error: updateError } = await supabase
    .from("app_user_memberships")
    .update({
      invite_link: inviteLink.toString(),
      invite_generated_at: generatedAt,
      invite_expires_at: null,
      invite_token: null,
      auth_user_id: data.user?.id ?? membership.authUserId ?? null,
      updated_at: generatedAt,
    })
    .eq("id", membershipId);

  if (updateError) {
    throw new Error(`Unable to save invite link: ${updateError.message}`);
  }

  return inviteLink.toString();
}

export async function findAppUserMembershipByInviteToken(inviteToken: string) {
  if (getPersistenceMode() === "mock") {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("app_user_memberships")
    .select("*")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load invite: ${error.message}`);
  }

  return data ? normalizeMembershipRow(data as AppUserMembershipRow) : null;
}

export async function completeAppUserMembershipInvite(input: {
  inviteToken: string;
  email: string;
  password: string;
}) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Invite acceptance requires Supabase.");
  }

  const supabase = getSupabaseAdminClient();
  const membership = await findAppUserMembershipByInviteToken(input.inviteToken);

  if (!membership || !membership.isActive) {
    throw new Error("This invite link is invalid or no longer active.");
  }

  if (membership.authUserId) {
    throw new Error("This profile is already linked to an account. Use Sign In or Forgot Password.");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const { data: conflictingMembership } = await supabase
    .from("app_user_memberships")
    .select("id")
    .eq("email", normalizedEmail)
    .neq("id", membership.id)
    .maybeSingle();

  if (conflictingMembership) {
    throw new Error("That email is already attached to another profile.");
  }

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      membershipId: membership.id,
      role: membership.role,
      playerRosterMembershipId: membership.playerRosterMembershipId ?? null,
      coachProfileId: membership.coachProfileId ?? null,
      managerProfileId: membership.managerProfileId ?? null,
    },
  });

  if (createUserError || !createdUser.user) {
    throw new Error(createUserError?.message ?? "Unable to create account from invite.");
  }

  const now = new Date().toISOString();
  const { error: updateMembershipError } = await supabase
    .from("app_user_memberships")
    .update({
      email: normalizedEmail,
      auth_user_id: createdUser.user.id,
      invite_token: null,
      invite_link: null,
      invite_generated_at: now,
      invite_expires_at: null,
      updated_at: now,
    })
    .eq("id", membership.id);

  if (updateMembershipError) {
    throw new Error(`Unable to finish invite setup: ${updateMembershipError.message}`);
  }

  return {
    membershipId: membership.id,
    email: normalizedEmail,
    role: membership.role,
  };
}

export async function findAndSyncMembershipForAuthUser(user: User) {
  if (getPersistenceMode() === "mock") {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const metadata = user.user_metadata ?? {};
  const membershipId =
    typeof metadata.membershipId === "string" && metadata.membershipId.trim().length > 0
      ? metadata.membershipId
      : null;
  const normalizedEmail = user.email ? normalizeEmail(user.email) : null;

  let row: AppUserMembershipRow | null = null;

  if (membershipId) {
    const { data } = await supabase
      .from("app_user_memberships")
      .select("*")
      .eq("id", membershipId)
      .maybeSingle();
    row = (data as AppUserMembershipRow | null) ?? null;
  }

  if (!row) {
    const { data } = await supabase
      .from("app_user_memberships")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    row = (data as AppUserMembershipRow | null) ?? null;
  }

  if (!row && normalizedEmail) {
    const { data } = await supabase
      .from("app_user_memberships")
      .select("*")
      .eq("email", normalizedEmail)
      .maybeSingle();
    row = (data as AppUserMembershipRow | null) ?? null;
  }

  if (!row) {
    return null;
  }

  const updates: Record<string, string | null> = {};
  if (row.auth_user_id !== user.id) {
    updates.auth_user_id = user.id;
  }
  if (normalizedEmail && row.email !== normalizedEmail) {
    updates.email = normalizedEmail;
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from("app_user_memberships")
      .update(updates)
      .eq("id", row.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Unable to sync access membership: ${error.message}`);
    }

    row = data as AppUserMembershipRow;
  }

  return normalizeMembershipRow(row);
}
