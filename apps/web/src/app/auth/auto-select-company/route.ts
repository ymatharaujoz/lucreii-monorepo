import { NextResponse } from "next/server";
import { selectCompanyOnServer } from "@/lib/server-select-company";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId")?.trim();

  if (!companyId) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const result = await selectCompanyOnServer(companyId, request.url);

  if (result.error || !result.response) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  const redirectResponse = NextResponse.redirect(new URL("/app", request.url));

  for (const cookie of result.response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  }

  return redirectResponse;
}
