import { NextResponse } from "next/server";
import { exchangeAuthTicketApiResponseSchema } from "@marginflow/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";
import {
  createSignedWebAuthSession,
  getWebSessionSecret,
  WEB_AUTH_SESSION_COOKIE_NAME,
} from "@/lib/web-auth-session";

function sanitizeNextPath(input: string | null) {
  if (!input || !input.startsWith("/")) {
    return "/app";
  }

  if (input.startsWith("//")) {
    return "/app";
  }

  return input;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticket = url.searchParams.get("ticket");
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));

  if (!ticket) {
    return NextResponse.redirect(new URL("/sign-in?auth_error=oauth_complete_failed", url));
  }

  const response = await fetch(`${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/auth-state/exchange-ticket`, {
    body: JSON.stringify({ ticket }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL("/sign-in?auth_error=oauth_complete_failed", url));
  }

  const payload = await response.json();
  const data = parseApiContract(
    "/auth-state/exchange-ticket",
    payload,
    exchangeAuthTicketApiResponseSchema,
  ).data;
  const cookieValue = createSignedWebAuthSession(
    {
      authState: data.authState,
      remoteSessionToken: data.remoteSessionToken,
    },
    getWebSessionSecret(),
  );
  const redirectUrl = new URL(nextPath, url.origin);
  const nextResponse = NextResponse.redirect(redirectUrl);

  nextResponse.cookies.set(WEB_AUTH_SESSION_COOKIE_NAME, cookieValue, {
    expires: new Date(data.authState.session.expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: redirectUrl.protocol === "https:",
  });

  return nextResponse;
}
