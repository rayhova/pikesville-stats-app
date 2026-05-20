import "server-only";

import webpush from "web-push";
import type { AppRole } from "@/lib/access-config";
import { listAppUserMembershipRows } from "@/lib/auth-access";
import { listEventAttendanceRows } from "@/lib/admin-repository";
import { getPushEnv, getPersistenceMode } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface PushSubscriptionRow {
  id: string;
  auth_user_id: string;
  membership_id: string | null;
  role: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  last_notified_at: string | null;
}

interface PushSubscriptionPayload {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

interface PushAudienceInput {
  targetRoles?: AppRole[];
  targetRosterMembershipIds?: string[];
  targetCoachProfileIds?: string[];
  targetManagerProfileIds?: string[];
  onlyPendingAttendanceFor?: {
    eventKind: "game" | "practice";
    eventId: string;
  };
}

function configureWebPush() {
  const env = getPushEnv();
  webpush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
}

function toWebPushSubscription(row: PushSubscriptionRow) {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

function roleMatchesAudience(
  row: Awaited<ReturnType<typeof listAppUserMembershipRows>>[number],
  audience: PushAudienceInput,
) {
  const hasRoleFilter = Boolean(audience.targetRoles && audience.targetRoles.length > 0);
  if (hasRoleFilter && !audience.targetRoles!.includes(row.role)) {
    return false;
  }

  if (row.role === "player" && audience.targetRosterMembershipIds?.length) {
    return row.playerRosterMembershipId
      ? audience.targetRosterMembershipIds.includes(row.playerRosterMembershipId)
      : false;
  }

  if (row.role === "coach" && audience.targetCoachProfileIds?.length) {
    return row.coachProfileId ? audience.targetCoachProfileIds.includes(row.coachProfileId) : false;
  }

  if (row.role === "manager" && audience.targetManagerProfileIds?.length) {
    return row.managerProfileId
      ? audience.targetManagerProfileIds.includes(row.managerProfileId)
      : false;
  }

  return true;
}

function hasAttendanceResponse(
  row: Awaited<ReturnType<typeof listAppUserMembershipRows>>[number],
  eventRows: Awaited<ReturnType<typeof listEventAttendanceRows>>,
  eventKind: "game" | "practice",
  eventId: string,
) {
  return eventRows.some((eventRow) => {
    if (eventRow.eventKind !== eventKind || eventRow.eventId !== eventId) {
      return false;
    }

    if (row.role === "player") {
      return eventRow.attendeeRole === "player" && eventRow.rosterMembershipId === row.playerRosterMembershipId;
    }

    if (row.role === "coach") {
      return eventRow.attendeeRole === "coach" && eventRow.coachProfileId === row.coachProfileId;
    }

    if (row.role === "manager") {
      return eventRow.attendeeRole === "manager" && eventRow.managerProfileId === row.managerProfileId;
    }

    return false;
  });
}

async function resolveAudienceAuthUserIds(audience: PushAudienceInput) {
  const memberships = (await listAppUserMembershipRows()).filter(
    (row) => row.isActive && Boolean(row.authUserId),
  );
  const roleMatched = memberships.filter((row) => roleMatchesAudience(row, audience));

  if (!audience.onlyPendingAttendanceFor) {
    return [...new Set(roleMatched.map((row) => row.authUserId!).filter(Boolean))];
  }

  const pendingAttendance = audience.onlyPendingAttendanceFor;
  const attendanceRows = await listEventAttendanceRows();
  const pendingRows = roleMatched.filter(
    (row) =>
      row.role !== "admin" &&
      !hasAttendanceResponse(
        row,
        attendanceRows,
        pendingAttendance.eventKind,
        pendingAttendance.eventId,
      ),
  );

  return [...new Set(pendingRows.map((row) => row.authUserId!).filter(Boolean))];
}

export async function savePushSubscription(input: {
  authUserId: string;
  membershipId?: string | null;
  role?: string | null;
  subscription: PushSubscriptionPayload;
  userAgent?: string | null;
}) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Push notifications require Supabase.");
  }

  const keys = input.subscription.keys;
  if (!keys?.p256dh || !keys.auth) {
    throw new Error("Push subscription keys are missing.");
  }

  const supabase = getSupabaseAdminClient();
  const payload = {
    auth_user_id: input.authUserId,
    membership_id: input.membershipId ?? null,
    role: input.role ?? null,
    endpoint: input.subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: input.userAgent ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("push_subscriptions").upsert(payload, {
    onConflict: "endpoint",
  });

  if (error) {
    throw new Error(`Unable to save push subscription: ${error.message}`);
  }
}

export async function deletePushSubscription(input: {
  authUserId: string;
  endpoint: string;
}) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Push notifications require Supabase.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("auth_user_id", input.authUserId)
    .eq("endpoint", input.endpoint);

  if (error) {
    throw new Error(`Unable to delete push subscription: ${error.message}`);
  }
}

export async function sendPushNotificationToUser(input: {
  authUserId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  if (getPersistenceMode() === "mock") {
    throw new Error("Push notifications require Supabase.");
  }

  configureWebPush();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("auth_user_id", input.authUserId);

  if (error) {
    throw new Error(`Unable to load push subscriptions: ${error.message}`);
  }

  const rows = (data ?? []) as PushSubscriptionRow[];
  const staleEndpoints: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          toWebPushSubscription(row),
          JSON.stringify({
            title: input.title,
            body: input.body,
            url: input.url ?? "/",
            tag: input.tag ?? "pikesville-program-hub",
          }),
        );
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(row.endpoint);
          return;
        }

        throw error;
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    const { error: cleanupError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", staleEndpoints);

    if (cleanupError) {
      throw new Error(`Unable to clear stale push subscriptions: ${cleanupError.message}`);
    }
  }

  if (rows.length > 0) {
    const { error: updateError } = await supabase
      .from("push_subscriptions")
      .update({ last_notified_at: new Date().toISOString() })
      .eq("auth_user_id", input.authUserId);

    if (updateError) {
      throw new Error(`Unable to update push notification status: ${updateError.message}`);
    }
  }
}

export async function sendPushNotificationToAudience(
  input: PushAudienceInput & {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  },
) {
  const authUserIds = await resolveAudienceAuthUserIds(input);

  await Promise.allSettled(
    authUserIds.map((authUserId) =>
      sendPushNotificationToUser({
        authUserId,
        title: input.title,
        body: input.body,
        url: input.url,
        tag: input.tag,
      }),
    ),
  );

  return authUserIds.length;
}
