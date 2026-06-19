import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const selectCompanyOnServerMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-select-company", () => ({
  selectCompanyOnServer: selectCompanyOnServerMock,
}));

describe("GET /auth/auto-select-company", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("redirects to /app when companyId is missing", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.com/auth/auto-select-company"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/app");
    expect(selectCompanyOnServerMock).not.toHaveBeenCalled();
  });

  it("selects company, copies cookies and redirects to /app on success", async () => {
    const successResponse = new NextResponse(null, { status: 200 });
    successResponse.cookies.set("lucreii.web_session", "signed-session");
    successResponse.cookies.set("lucreii_selected_company_id", "company_123");

    selectCompanyOnServerMock.mockResolvedValueOnce({
      error: null,
      response: successResponse,
      status: 200,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "https://example.com/auth/auto-select-company?companyId=company_123",
      ),
    );

    expect(selectCompanyOnServerMock).toHaveBeenCalledWith(
      "company_123",
      "https://example.com/auth/auto-select-company?companyId=company_123",
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/app");
    expect(response.headers.get("set-cookie")).toContain(
      "lucreii_selected_company_id=company_123",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "lucreii.web_session=signed-session",
    );
  });

  it("redirects to /app when selectCompanyOnServer fails", async () => {
    selectCompanyOnServerMock.mockResolvedValueOnce({
      error: { message: "Authentication required." },
      response: null,
      status: 401,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "https://example.com/auth/auto-select-company?companyId=company_123",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/app");
  });
});
