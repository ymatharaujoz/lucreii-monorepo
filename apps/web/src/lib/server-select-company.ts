import { NextResponse } from "next/server";
import { companyRecordSchema } from "@lucreii/validation";
import { getWebEnv } from "@/lib/env";
import {
  buildRemoteAuthHeaders,
  readServerWebAuthSession,
} from "@/lib/server-session";
import {
  createSignedWebAuthSession,
  getWebSessionSecret,
  WEB_AUTH_SESSION_COOKIE_NAME,
  WEB_SELECTED_COMPANY_COOKIE_NAME,
} from "@/lib/web-auth-session";

export async function selectCompanyOnServer(
  companyId: string,
  requestUrl: string,
) {
  const webSession = await readServerWebAuthSession();

  if (!webSession) {
    return {
      error: { message: "Authentication required." },
      response: null,
      status: 401,
    };
  }

  const trimmedCompanyId = companyId.trim();

  if (!trimmedCompanyId) {
    return {
      error: { message: "Company id is required." },
      response: null,
      status: 400,
    };
  }

  const response = await fetch(
    `${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/companies/${trimmedCompanyId}/select`,
    {
      headers: buildRemoteAuthHeaders(
        webSession.remoteSessionToken,
        webSession.authState.selectedCompanyId,
      ),
      method: "PATCH",
    },
  );

  if (!response.ok) {
    const payload = await response.text();

    return {
      error: { message: payload || "Could not select company." },
      response: null,
      status: response.status,
    };
  }

  const payload = await response.json();
  const selectedCompany = companyRecordSchema.parse(
    (payload as { data?: unknown }).data,
  );
  const nextAuthState = {
    ...webSession.authState,
    selectedCompanyId: selectedCompany.id,
  };
  const cookieValue = createSignedWebAuthSession(
    {
      authState: nextAuthState,
      remoteSessionToken: webSession.remoteSessionToken,
    },
    getWebSessionSecret(),
  );

  const nextResponse = NextResponse.json({
    data: {
      selectedCompanyId: selectedCompany.id,
    },
    error: null,
  });

  nextResponse.cookies.set(WEB_AUTH_SESSION_COOKIE_NAME, cookieValue, {
    expires: new Date(nextAuthState.session.expiresAt),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: requestUrl.startsWith("https://"),
  });
  nextResponse.cookies.set(
    WEB_SELECTED_COMPANY_COOKIE_NAME,
    selectedCompany.id,
    {
      expires: new Date(nextAuthState.session.expiresAt),
      httpOnly: false,
      path: "/",
      sameSite: "lax",
      secure: requestUrl.startsWith("https://"),
    },
  );

  return {
    error: null,
    response: nextResponse,
    status: 200,
  };
}
