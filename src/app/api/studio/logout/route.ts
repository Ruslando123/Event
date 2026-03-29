import { NextResponse } from "next/server";
import { STUDIO_SESSION_COOKIE } from "@/lib/studio-session";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(STUDIO_SESSION_COOKIE);
  return res;
}
