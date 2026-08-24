import { NextResponse } from "next/server";
import { WEB_AUTH_SESSION_COOKIE_NAME } from "@/lib/web-auth-session";

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url), {
    status: 303,
  });

  response.headers.set("Cache-Control", "no-store");
  response.cookies.delete(WEB_AUTH_SESSION_COOKIE_NAME);

  return response;
}
