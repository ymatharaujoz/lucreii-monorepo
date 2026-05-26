import { NextResponse } from "next/server";
import { WEB_AUTH_SESSION_COOKIE_NAME } from "@/lib/web-auth-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(WEB_AUTH_SESSION_COOKIE_NAME);
  return response;
}
