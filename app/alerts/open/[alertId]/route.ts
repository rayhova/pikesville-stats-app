import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAccessSession } from "@/lib/access-control";
import { markProgramAlertRead } from "@/lib/program-alerts";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ alertId: string }> },
) {
  const session = await getAccessSession();
  const { alertId } = await params;
  const url = new URL(request.url);
  const nextHref = url.searchParams.get("next") || "/";

  if (session.role) {
    try {
      await markProgramAlertRead({
        alertId,
        session: session as typeof session & { role: "admin" | "coach" | "manager" | "player" },
      });
      revalidatePath("/");
    } catch (error) {
      console.error("Unable to mark alert as read", error);
    }
  }

  return NextResponse.redirect(new URL(nextHref, request.url));
}
