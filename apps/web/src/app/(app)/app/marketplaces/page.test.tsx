import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MarketplacesPage from "./page";

const redirectMock = vi.hoisted(() => vi.fn());
const dashboardHomeMock = vi.hoisted(() =>
  vi.fn(() => <div>dashboard-home</div>),
);
const readServerAuthStateMock = vi.hoisted(() => vi.fn());
const readServerBillingStateMock = vi.hoisted(() => vi.fn());
const readServerCompaniesMock = vi.hoisted(() => vi.fn());
const hasActiveCompanyMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/modules/dashboard", () => ({
  DashboardHome: dashboardHomeMock,
}));

vi.mock("@/lib/server-auth", () => ({
  readServerAuthState: readServerAuthStateMock,
}));

vi.mock("@/lib/server-billing", () => ({
  readServerBillingState: readServerBillingStateMock,
}));

vi.mock("@/lib/server-companies", () => ({
  readServerCompanies: readServerCompaniesMock,
  hasActiveCompany: hasActiveCompanyMock,
}));

const activeCompanyFixture = {
  code: "MELI",
  createdAt: "2026-05-09T10:00:00.000Z",
  fixedCostDefault: "1500.00",
  id: "company_1",
  isActive: true,
  name: "Mercado Livre",
  taxRateDefault: "0.120000",
  updatedAt: "2026-05-09T10:00:00.000Z",
};

describe("MarketplacesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Dashboard with orders for entitled authenticated users", async () => {
    readServerAuthStateMock.mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      selectedCompanyId: "company_1",
      user: {
        name: "Mateus",
      },
    });
    readServerBillingStateMock.mockResolvedValueOnce({
      entitled: true,
      status: "active",
    });
    readServerCompaniesMock.mockResolvedValueOnce([activeCompanyFixture]);
    hasActiveCompanyMock.mockReturnValueOnce(true);

    const result = await MarketplacesPage();
    const markup = renderToStaticMarkup(result);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(markup).toContain("dashboard-home");
    expect(dashboardHomeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activeCompany: expect.objectContaining({ id: "company_1" }),
        companyName: "Lucreii",
        indicatorMode: "marketplace",
        showCompanyDefaultsEditor: false,
        showMarketplaceConnections: false,
        showOrders: true,
        showProductRanking: true,
        showProviderFilter: true,
      }),
      undefined,
    );
  });

  it("redirects non-entitled users to billing", async () => {
    readServerAuthStateMock.mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      user: {
        name: "Mateus",
      },
    });
    readServerBillingStateMock.mockResolvedValueOnce({
      entitled: false,
      status: "inactive",
    });
    readServerCompaniesMock.mockResolvedValueOnce([]);
    hasActiveCompanyMock.mockReturnValueOnce(false);

    await MarketplacesPage();

    expect(redirectMock).toHaveBeenCalledWith("/app/billing");
  });
});
