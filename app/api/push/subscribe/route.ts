import { NextResponse } from "next/server";
import { getAccessSession } from "@/lib/access-control";
import { savePushSubscription } from "@/lib/push-notifications";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const session = await getAccessSession();

  if (!session.authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    subscription?: {
      endpoint?: string;
      keys?: {
        p256dh?: string;
        auth?: string;
      };
    };
    userAgent?: string;
  };

  if (!payload.subscription?.endpoint) {
    return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
  }

  const subscription = {
    endpoint: payload.subscription.endpoint,
    keys: payload.subscription.keys,
  };

  const supabase = getSupabaseAdminClient();
  const { data: membership, error } = await supabase
    .from("app_user_memberships")
    .select("id, role")
    .eq("auth_user_id", session.authUserId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await savePushSubscription({
      authUserId: session.authUserId,
      membershipId: membership?.id ?? null,
      role: membership?.role ?? session.role,
      subscription,
      userAgent: payload.userAgent ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save push subscription." },
      { status: 500 },
    );
  }
}
