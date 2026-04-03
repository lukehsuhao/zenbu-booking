import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const providerId = req.nextUrl.searchParams.get("state");

  if (!code || !providerId) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  await handleCallback(code, providerId);
  return NextResponse.redirect(new URL("/providers", req.url));
}
