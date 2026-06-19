import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NewCompanyPage from "./page";

const redirectMock = vi.hoisted(() => vi.fn());
const companyCreationPanelMock = vi.hoisted(() => vi.fn(() => <div>company-creation-panel</div>));
const readServerAuthStateMock = vi.hoisted(() => vi.fn());
const readServerBillingStateMock = vi.hoisted(() => vi.fn());
const readServerCompaniesMock = vi.hoisted(() => vi.fn());
const hasActiveCompanyMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/components/companies/company-creation-panel", () => ({
  CompanyCreationPanel: companyCreationPanelMock,
}));

vi.mock("@/lib/server-auth", () => ({
  readServerAuthState: readServerAuthStateMock,
}));

vi.mock("@/lib/server-billing", () => ({
  readServerBillingState: readServerBillingStateMock,
}));

vi.mock("@/lib/server-companies", () => ({
  hasActiveCompany: hasActiveCompanyMock,
  readServerCompanies: readServerCompaniesMock,
}));

describe("NewCompanyPage", () => {
  it("renders the company creation panel with the current plan usage", async () => {
    readServerAuthStateMock.mockResolvedValueOnce({
      organization: {
        id: "org_123",
        name: "Lucreii",
        role: "owner",
        slug: "lucreii",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    readServerBillingStateMock.mockResolvedValueOnce({
      entitled: true,
      status: "active",
      subscription: {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        externalSubscriptionId: "sub_1",
        id: "sub_1",
        interval: "monthly",
        planCode: "pro",
        status: "active",
        trialEnd: null,
        trialStart: null,
      },
    });
    readServerCompaniesMock.mockResolvedValueOnce([
      {
        cnpj: "12345678000195",
        id: "company_1",
        isActive: true,
        isSelected: true,
        razaoSocial: "Mercado Livre LTDA",
      },
      {
        cnpj: "11222333000181",
        id: "company_2",
        isActive: true,
        isSelected: false,
        razaoSocial: "Shopee LTDA",
      },
    ]);
    hasActiveCompanyMock.mockReturnValueOnce(true);

    const result = await NewCompanyPage();
    const markup = renderToStaticMarkup(result);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(markup).toContain("company-creation-panel");
    expect(companyCreationPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        companyCount: 2,
        companyLimit: 3,
        organizationName: "Lucreii",
      }),
      undefined,
    );
  });
});
