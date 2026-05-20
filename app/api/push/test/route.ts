import { NextResponse } from "next/server";
import { getAccessSession } from "@/lib/access-control";
import { sendPushNotificationToUser } from "@/lib/push-notifications";

export async function POST() {
  const session = await getAccessSession();

  if (!session.authUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sendPushNotificationToUser({
      authUserId: session.authUserId,
      title: "Pikesville MBB App",
      body: "Test notification sent successfully.",
      url: "/tasks",
      tag: "pikesville-test-notification",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to send test notification." },
      { status: 500 },
    );
  }
}
