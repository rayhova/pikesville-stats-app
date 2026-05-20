import { NextResponse } from "next/server";
import { getAccessSession } from "@/lib/access-control";
import { deletePushSubscription } from "@/lib/push-notifications";

export async function POST(request: Request) {
  const session = await getAccessSession();

  if (!session.authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { endpoint?: string };

  if (!payload.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  try {
    await deletePushSubscription({
      authUserId: session.authUserId,
      endpoint: payload.endpoint,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete push subscription." },
      { status: 500 },
    );
  }
}
