import { NextResponse } from "next/server";
import { getPushEnv, isPushConfigured } from "@/lib/env";

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ publicKey: null }, { status: 200 });
  }

  return NextResponse.json({ publicKey: getPushEnv().publicKey });
}
