import { cookies } from "next/headers";
import {
  buildRemoteAuthCookieHeader,
  getWebSessionSecret,
  readSignedWebAuthSession,
  WEB_AUTH_SESSION_COOKIE_NAME,
  type WebAuthSessionPayload,
} from "@/lib/web-auth-session";

export async function readServerWebAuthSession(): Promise<WebAuthSessionPayload | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(WEB_AUTH_SESSION_COOKIE_NAME)?.value;

  if (!value) {
    return null;
  }

  try {
    return readSignedWebAuthSession(value, getWebSessionSecret());
  } catch {
    return null;
  }
}

export function buildRemoteAuthHeaders(remoteSessionToken: string) {
  return {
    cookie: buildRemoteAuthCookieHeader(remoteSessionToken),
  };
}
