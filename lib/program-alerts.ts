import "server-only";

import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/access-config";
import type { AccessSession } from "@/lib/access-control";
import { getPersistenceMode } from "@/lib/env";
import { sendPushNotificationToAudience } from "@/lib/push-notifications";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export interface ProgramAlertRow {
  id: string;
  title: string;
  body: string;
  href?: string;
  category: string;
  sourceRole?: string;
  sourceLabel?: string;
  targetRoles: AppRole[];
  targetRosterMembershipIds: string[];
  targetCoachProfileIds: string[];
  targetManagerProfileIds: string[];
  createdAt: string;
}

export interface CoachScoutingSuggestionRow {
  id: string;
  gameId: string;
  coachProfileId: string;
  coachDisplayName: string;
  note: string;
  createdAt: string;
}

export interface CoachPracticeSuggestionRow {
  id: string;
  practicePlanId: string;
  coachProfileId: string;
  coachDisplayName: string;
  note: string;
  createdAt: string;
}

function normalizeAlert(row: any): ProgramAlertRow {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    href: row.href ?? undefined,
    category: row.category ?? "custom",
    sourceRole: row.source_role ?? undefined,
    sourceLabel: row.source_label ?? undefined,
    targetRoles: Array.isArray(row.target_roles) ? row.target_roles : [],
    targetRosterMembershipIds: Array.isArray(row.target_roster_membership_ids) ? row.target_roster_membership_ids : [],
    targetCoachProfileIds: Array.isArray(row.target_coach_profile_ids) ? row.target_coach_profile_ids : [],
    targetManagerProfileIds: Array.isArray(row.target_manager_profile_ids) ? row.target_manager_profile_ids : [],
    createdAt: row.created_at,
  };
}

function coachDisplayNameFromRelation(value: any) {
  if (Array.isArray(value)) {
    return value[0]?.display_name ?? "Coach";
  }
  return value?.display_name ?? "Coach";
}

function isAlertVisible(alert: ProgramAlertRow, session: AccessSession & { role: AppRole }) {
  if (session.role === "admin") {
    return alert.targetRoles.length === 0 || alert.targetRoles.includes("admin");
  }

  if (alert.targetRoles.length > 0 && !alert.targetRoles.includes(session.role)) {
    return false;
  }

  if (session.role === "player" && alert.targetRosterMembershipIds.length > 0) {
    return session.playerRosterMembershipId
      ? alert.targetRosterMembershipIds.includes(session.playerRosterMembershipId)
      : false;
  }

  if (session.role === "coach" && alert.targetCoachProfileIds.length > 0) {
    return session.coachProfileId ? alert.targetCoachProfileIds.includes(session.coachProfileId) : false;
  }

  if (session.role === "manager" && alert.targetManagerProfileIds.length > 0) {
    return session.managerProfileId ? alert.targetManagerProfileIds.includes(session.managerProfileId) : false;
  }

  return true;
}

export function buildAlertOpenHref(alertId: string, nextHref?: string) {
  const url = new URL(`/alerts/open/${alertId}`, "https://app.pikesvillembb.com");
  if (nextHref) {
    url.searchParams.set("next", nextHref);
  }
  return `${url.pathname}${url.search}`;
}

export async function createProgramAlert(input: {
  title: string;
  body: string;
  href?: string;
  category?: string;
  sourceRole?: string;
  sourceLabel?: string;
  targetRoles?: AppRole[];
  targetRosterMembershipIds?: string[];
  targetCoachProfileIds?: string[];
  targetManagerProfileIds?: string[];
}) {
  if (getPersistenceMode() === "mock") {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const payload = {
    id: crypto.randomUUID(),
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    category: input.category ?? "custom",
    source_role: input.sourceRole ?? null,
    source_label: input.sourceLabel ?? null,
    target_roles: input.targetRoles ?? [],
    target_roster_membership_ids: input.targetRosterMembershipIds ?? [],
    target_coach_profile_ids: input.targetCoachProfileIds ?? [],
    target_manager_profile_ids: input.targetManagerProfileIds ?? [],
  };

  const { data, error } = await supabase.from("program_alerts").insert(payload).select("*").single();
  if (error) {
    throw new Error(`Unable to create alert: ${error.message}`);
  }

  return normalizeAlert(data);
}

export async function createAndDispatchProgramAlert(input: {
  title: string;
  body: string;
  href?: string;
  category?: string;
  sourceRole?: string;
  sourceLabel?: string;
  targetRoles?: AppRole[];
  targetRosterMembershipIds?: string[];
  targetCoachProfileIds?: string[];
  targetManagerProfileIds?: string[];
  onlyPendingAttendanceFor?: {
    eventKind: "game" | "practice";
    eventId: string;
  };
  tag?: string;
}) {
  const alert = await createProgramAlert(input);
  const wrappedHref = alert ? buildAlertOpenHref(alert.id, alert.href) : input.href ?? "/";

  await sendPushNotificationToAudience({
    title: input.title,
    body: input.body,
    url: wrappedHref,
    tag: input.tag,
    targetRoles: input.targetRoles,
    targetRosterMembershipIds: input.targetRosterMembershipIds,
    targetCoachProfileIds: input.targetCoachProfileIds,
    targetManagerProfileIds: input.targetManagerProfileIds,
    onlyPendingAttendanceFor: input.onlyPendingAttendanceFor,
  });

  return alert;
}

export async function listUnreadProgramAlerts(session: AccessSession & { role: AppRole }) {
  if (getPersistenceMode() === "mock") {
    return [] as ProgramAlertRow[];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("program_alerts")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load alerts: ${error.message}`);
  }

  const { data: reads, error: readError } = await supabase.from("program_alert_reads").select("*");
  if (readError) {
    throw new Error(`Unable to load alert read state: ${readError.message}`);
  }

  return (data ?? [])
    .map(normalizeAlert)
    .filter((alert) => isAlertVisible(alert, session))
    .filter((alert) => {
      return !(reads ?? []).some((read) => {
        if (read.alert_id !== alert.id || read.reader_role !== session.role) {
          return false;
        }
        if (session.role === "player") {
          return read.roster_membership_id === session.playerRosterMembershipId;
        }
        if (session.role === "coach") {
          return read.coach_profile_id === session.coachProfileId;
        }
        if (session.role === "manager") {
          return read.manager_profile_id === session.managerProfileId;
        }
        return true;
      });
    });
}

export async function markProgramAlertRead(input: {
  alertId: string;
  session: AccessSession & { role: AppRole };
}) {
  if (getPersistenceMode() === "mock") {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data: existingReads, error: lookupError } = await supabase
    .from("program_alert_reads")
    .select("id, roster_membership_id, coach_profile_id, manager_profile_id")
    .eq("alert_id", input.alertId)
    .eq("reader_role", input.session.role)
    .order("read_at", { ascending: false });

  if (lookupError) {
    throw new Error(`Unable to load alert read state: ${lookupError.message}`);
  }

  const existing = (existingReads ?? []).find((read) => {
    if (input.session.role === "player") {
      return read.roster_membership_id === input.session.playerRosterMembershipId;
    }

    if (input.session.role === "coach") {
      return read.coach_profile_id === input.session.coachProfileId;
    }

    if (input.session.role === "manager") {
      return read.manager_profile_id === input.session.managerProfileId;
    }

    return !read.roster_membership_id && !read.coach_profile_id && !read.manager_profile_id;
  });

  if (existing) {
    return;
  }

  const { error } = await supabase.from("program_alert_reads").insert({
    id: crypto.randomUUID(),
    alert_id: input.alertId,
    reader_role: input.session.role,
    roster_membership_id: input.session.playerRosterMembershipId ?? null,
    coach_profile_id: input.session.coachProfileId ?? null,
    manager_profile_id: input.session.managerProfileId ?? null,
  });

  if (error) {
    throw new Error(`Unable to mark alert as read: ${error.message}`);
  }
}

export async function openProgramAlert(input: {
  alertId: string;
  session: AccessSession & { role: AppRole };
  nextHref?: string;
}) {
  await markProgramAlertRead({ alertId: input.alertId, session: input.session });
  redirect(input.nextHref || "/");
}

export async function createCoachScoutingSuggestion(input: {
  gameId: string;
  coachProfileId: string;
  note: string;
}) {
  if (getPersistenceMode() === "mock") {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coach_scouting_suggestions")
    .insert({
      id: crypto.randomUUID(),
      game_id: input.gameId,
      coach_profile_id: input.coachProfileId,
      note: input.note,
    })
    .select("id, game_id, coach_profile_id, note, created_at, coach_profiles(display_name)")
    .single();

  if (error) {
    throw new Error(`Unable to save scouting suggestion: ${error.message}`);
  }

    return {
      id: data.id,
      gameId: data.game_id,
      coachProfileId: data.coach_profile_id,
      coachDisplayName: coachDisplayNameFromRelation(data.coach_profiles),
      note: data.note,
      createdAt: data.created_at,
    } satisfies CoachScoutingSuggestionRow;
}

export async function listCoachScoutingSuggestions(gameId: string) {
  if (getPersistenceMode() === "mock") {
    return [] as CoachScoutingSuggestionRow[];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coach_scouting_suggestions")
    .select("id, game_id, coach_profile_id, note, created_at, coach_profiles(display_name)")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load scouting suggestions: ${error.message}`);
  }

  return (data ?? []).map(
    (row) =>
      ({
        id: row.id,
        gameId: row.game_id,
        coachProfileId: row.coach_profile_id,
        coachDisplayName: coachDisplayNameFromRelation(row.coach_profiles),
        note: row.note,
        createdAt: row.created_at,
      }) satisfies CoachScoutingSuggestionRow,
  );
}

export async function createCoachPracticeSuggestion(input: {
  practicePlanId: string;
  coachProfileId: string;
  note: string;
}) {
  if (getPersistenceMode() === "mock") {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coach_practice_suggestions")
    .insert({
      id: crypto.randomUUID(),
      practice_plan_id: input.practicePlanId,
      coach_profile_id: input.coachProfileId,
      note: input.note,
    })
    .select("id, practice_plan_id, coach_profile_id, note, created_at, coach_profiles(display_name)")
    .single();

  if (error) {
    throw new Error(`Unable to save practice suggestion: ${error.message}`);
  }

    return {
      id: data.id,
      practicePlanId: data.practice_plan_id,
      coachProfileId: data.coach_profile_id,
      coachDisplayName: coachDisplayNameFromRelation(data.coach_profiles),
      note: data.note,
      createdAt: data.created_at,
    } satisfies CoachPracticeSuggestionRow;
}

export async function listCoachPracticeSuggestions(practicePlanId: string) {
  if (getPersistenceMode() === "mock") {
    return [] as CoachPracticeSuggestionRow[];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("coach_practice_suggestions")
    .select("id, practice_plan_id, coach_profile_id, note, created_at, coach_profiles(display_name)")
    .eq("practice_plan_id", practicePlanId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load practice suggestions: ${error.message}`);
  }

  return (data ?? []).map(
    (row) =>
      ({
        id: row.id,
        practicePlanId: row.practice_plan_id,
        coachProfileId: row.coach_profile_id,
        coachDisplayName: coachDisplayNameFromRelation(row.coach_profiles),
        note: row.note,
        createdAt: row.created_at,
      }) satisfies CoachPracticeSuggestionRow,
  );
}
