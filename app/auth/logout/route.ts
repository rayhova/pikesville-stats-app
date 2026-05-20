import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accessCookieNames } from "@/lib/access-control";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(accessCookieNames.role);
  cookieStore.delete(accessCookieNames.playerRosterMembershipId);
  cookieStore.delete(accessCookieNames.coachProfileId);
  cookieStore.delete(accessCookieNames.managerProfileId);

  return NextResponse.json({ ok: true }, { status: 200 });
}
