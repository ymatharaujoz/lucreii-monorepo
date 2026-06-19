import { beforeEach, describe, expect, it, vi } from "vitest";

const getWebSessionSecretMock = vi.hoisted(() => vi.fn(() => "web-session-secret"));
const createSignedWebAuthSessionMock = vi.hoisted(() => vi.fn(() => "signed-web-session"));
const readServerWebAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/web-auth-session", () => ({
  WEB_AUTH_SESSION_COOKIE_NAME: "lucreii.web_session",
  WEB_SELECTED_COMPANY_COOKIE_NAME: "lucreii_selected_company_id",
  createSignedWebAuthSession: createSignedWebAuthSessionMock,
  getWebSessionSecret: getWebSessionSecretMock,
}));

vi.mock("@/lib/server-session", () => ({
  buildRemoteAuthHeaders: vi.fn(() => ({
    cookie: "lucreii_api_session=remote_session_token_123",
    "x-lucreii-company-id": "company_old",
  })),
  readServerWebAuthSession: readServerWebAuthSessionMock,
}));

describe("selectCompanyOnServer", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when there is no web session", async () => {
    readServerWebAuthSessionMock.mockResolvedValue(null);

    const { selectCompanyOnServer } = await import("./server-select-company");
    const result = await selectCompanyOnServer("company_123", "https://example.com/app");

    expect(result.status).toBe(401);
    expect(result.error?.message).toBe("Authentication required.");
  });

  it("returns 400 when companyId is empty", async () => {
    readServerWebAuthSessionMock.mockResolvedValue({
      authState: {
        onboardingStatus: "complete",
        organization: { id: "org_123", name: "Lucreii", role: "owner", slug: "lucreii" },
        selectedCompanyId: "company_old",
        session: { expiresAt: "2026-12-31T00:00:00.000Z", id: "session_123" },
        user: { email: "owner@lucreii.local", emailVerified: true, id: "user_123", image: null, name: "Mateus" },
      },
      remoteSessionToken: "remote_session_token_123",
    });

    const { selectCompanyOnServer } = await import("./server-select-company");
    const result = await selectCompanyOnServer("", "https://example.com/app");

    expect(result.status).toBe(400);
    expect(result.error?.message).toBe("Company id is required.");
  });

  it("updates mirrored auth session and readable company cookie on success", async () => {
    readServerWebAuthSessionMock.mockResolvedValue({
      authState: {
        onboardingStatus: "complete",
        organization: { id: "org_123", name: "Lucreii", role: "owner", slug: "lucreii" },
        selectedCompanyId: "company_old",
        session: { expiresAt: "2026-12-31T00:00:00.000Z", id: "session_123" },
        user: { email: "owner@lucreii.local", emailVerified: true, id: "user_123", image: null, name: "Mateus" },
      },
      remoteSessionToken: "remote_session_token_123",
    });

    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              code: "MELI",
              cnpj: "12345678000195",
              createdAt: "2026-05-09T10:00:00.000Z",
              fixedCostDefault: "1500.00",
              id: "company_123",
              isActive: true,
              isSelected: true,
              razaoSocial: "Mercado Livre LTDA",
              taxRateDefault: "0.120000",
              updatedAt: "2026-05-09T10:00:00.000Z",
            },
            error: null,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 200,
          },
        ),
    ) as typeof fetch;

    const { selectCompanyOnServer } = await import("./server-select-company");
    const result = await selectCompanyOnServer("company_123", "https://example.com/app");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/companies/company_123/select",
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "lucreii_api_session=remote_session_token_123",
          "x-lucreii-company-id": "company_old",
        }),
        method: "PATCH",
      }),
    );
    expect(createSignedWebAuthSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authState: expect.objectContaining({
          selectedCompanyId: "company_123",
        }),
      }),
      "web-session-secret",
    );
    expect(result.status).toBe(200);
    expect(result.response?.headers.get("set-cookie")).toContain(
      "lucreii_selected_company_id=company_123",
    );
  });

  it("returns error when backend request fails", async () => {
    readServerWebAuthSessionMock.mockResolvedValue({
      authState: {
        onboardingStatus: "complete",
        organization: { id: "org_123", name: "Lucreii", role: "owner", slug: "lucreii" },
        selectedCompanyId: "company_old",
        session: { expiresAt: "2026-12-31T00:00:00.000Z", id: "session_123" },
        user: { email: "owner@lucreii.local", emailVerified: true, id: "user_123", image: null, name: "Mateus" },
      },
      remoteSessionToken: "remote_session_token_123",
    });

    global.fetch = vi.fn(
      async () =>
        new Response("Company not found", {
          status: 404,
        }),
    ) as typeof fetch;

    const { selectCompanyOnServer } = await import("./server-select-company");
    const result = await selectCompanyOnServer("company_123", "https://example.com/app");

    expect(result.status).toBe(404);
    expect(result.error?.message).toBe("Company not found");
  });
});
