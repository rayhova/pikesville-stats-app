import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { APP_ROLE_OPTIONS, getDefaultAccessDestination, type AppRole } from "@/lib/access-config";
import { findAndSyncMembershipForAuthUser } from "@/lib/auth-access";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export interface AccessSession {
  role: AppRole | null;
  playerRosterMembershipId: string | null;
  coachProfileId: string | null;
  managerProfileId: string | null;
  authUserId: string | null;
  authEmail: string | null;
  authSource: "supabase" | "staging" | null;
}

const ROLE_COOKIE = "pbs_access_role";
const PLAYER_COOKIE = "pbs_player_roster_id";
const COACH_COOKIE = "pbs_coach_profile_id";
const MANAGER_COOKIE = "pbs_manager_profile_id";

function isAppRole(value: string | undefined): value is AppRole {
  return (
    value === "admin" ||
    value === "coach" ||
    value === "manager" ||
    value === "player"
  );
}

export async function getAccessSession(): Promise<AccessSession> {
  const cookieStore = await cookies();

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const membership = await findAndSyncMembershipForAuthUser(user);

      if (membership && membership.isActive) {
        const rawPreviewRole = cookieStore.get(ROLE_COOKIE)?.value;
        const previewRole =
          membership.role === "admin" && isAppRole(rawPreviewRole)
            ? rawPreviewRole
            : membership.role;
        const previewPlayerRosterMembershipId =
          membership.role === "admin"
            ? cookieStore.get(PLAYER_COOKIE)?.value || null
            : membership.playerRosterMembershipId ?? null;
        const previewCoachProfileId =
          membership.role === "admin"
            ? cookieStore.get(COACH_COOKIE)?.value || null
            : membership.coachProfileId ?? null;
        const previewManagerProfileId =
          membership.role === "admin"
            ? cookieStore.get(MANAGER_COOKIE)?.value || null
            : membership.managerProfileId ?? null;

        return {
          role: previewRole,
          playerRosterMembershipId:
            previewRole === "player" ? previewPlayerRosterMembershipId : null,
          coachProfileId:
            previewRole === "coach" ? previewCoachProfileId : null,
          managerProfileId:
            previewRole === "manager" ? previewManagerProfileId : null,
          authUserId: user.id,
          authEmail: user.email ?? membership.email ?? null,
          authSource: "supabase",
        };
      }

      return {
        role: null,
        playerRosterMembershipId: null,
        coachProfileId: null,
        managerProfileId: null,
        authUserId: user.id,
        authEmail: user.email ?? null,
        authSource: "supabase",
      };
    }

    return {
      role: null,
      playerRosterMembershipId: null,
      coachProfileId: null,
      managerProfileId: null,
      authUserId: null,
      authEmail: null,
      authSource: null,
    };
  }

  const rawRole = cookieStore.get(ROLE_COOKIE)?.value;
  const role = isAppRole(rawRole) ? rawRole : null;
  const playerRosterMembershipId = cookieStore.get(PLAYER_COOKIE)?.value || null;
  const coachProfileId = cookieStore.get(COACH_COOKIE)?.value || null;
  const managerProfileId = cookieStore.get(MANAGER_COOKIE)?.value || null;

  return {
    role,
    playerRosterMembershipId,
    coachProfileId,
    managerProfileId,
    authUserId: null,
    authEmail: null,
    authSource: role ? "staging" : null,
  };
}

export async function requireAccessRole(
  allowedRoles: AppRole[],
): Promise<AccessSession & { role: AppRole }> {
  const session = await getAccessSession();

  if (!session.role || !allowedRoles.includes(session.role)) {
    redirect("/");
  }

  return session as AccessSession & { role: AppRole };
}

export function canViewAdmin(role: AppRole | null) {
  return role === "admin";
}

export function canUseScorer(role: AppRole | null) {
  return role === "admin" || role === "coach";
}

export function canUseObservations(role: AppRole | null) {
  return role === "admin" || role === "coach";
}

export function canViewStrategicPrep(role: AppRole | null) {
  return role === "admin" || role === "coach";
}

export const accessCookieNames = {
  role: ROLE_COOKIE,
  playerRosterMembershipId: PLAYER_COOKIE,
  coachProfileId: COACH_COOKIE,
  managerProfileId: MANAGER_COOKIE,
};
