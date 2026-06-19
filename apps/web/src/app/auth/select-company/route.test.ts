import { beforeEach, describe, expect, it, vi } from "vitest";

const selectCompanyOnServerMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-select-company", () => ({
  selectCompanyOnServer: selectCompanyOnServerMock,
}));

describe("PATCH /auth/select-company", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 400 when companyId is missing", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://marginflow-web.vercel.app/auth/select-company", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error.message).toBe("Company id is required.");
    expect(selectCompanyOnServerMock).not.toHaveBeenCalled();
  });

  it("delegates to selectCompanyOnServer and returns its response", async () => {
    const mockResponse = new Response(
      JSON.stringify({ data: { selectedCompanyId: "company_123" }, error: null }),
      { status: 200 },
    );

    selectCompanyOnServerMock.mockResolvedValueOnce({
      error: null,
      response: mockResponse,
      status: 200,
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://marginflow-web.vercel.app/auth/select-company", {
        body: JSON.stringify({ companyId: "company_123" }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }),
    );

    expect(selectCompanyOnServerMock).toHaveBeenCalledWith(
      "company_123",
      "https://marginflow-web.vercel.app/auth/select-company",
    );
    expect(response.status).toBe(200);
  });

  it("returns error from selectCompanyOnServer when it fails", async () => {
    selectCompanyOnServerMock.mockResolvedValueOnce({
      error: { message: "Authentication required." },
      response: null,
      status: 401,
    });

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://marginflow-web.vercel.app/auth/select-company", {
        body: JSON.stringify({ companyId: "company_123" }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }),
    );

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.message).toBe("Authentication required.");
  });
});
