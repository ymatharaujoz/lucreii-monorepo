import { NextResponse } from "next/server";
import { selectCompanyOnServer } from "@/lib/server-select-company";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    companyId?: string;
  } | null;
  const companyId = body?.companyId?.trim();

  if (!companyId) {
    return NextResponse.json(
      {
        error: {
          message: "Company id is required.",
        },
      },
      { status: 400 },
    );
  }

  const result = await selectCompanyOnServer(companyId, request.url);

  if (result.error) {
    return NextResponse.json(
      {
        error: result.error,
      },
      { status: result.status },
    );
  }

  return result.response!;
}
