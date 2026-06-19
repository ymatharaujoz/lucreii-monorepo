import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompanyCreationPanel } from "@/components/companies/company-creation-panel";
import { hasSubscriptionForProtectedApp } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";
import { hasActiveCompany, readServerCompanies } from "@/lib/server-companies";
import { BILLING_PLAN_BY_CODE, isBillingPlanCode } from "@lucreii/types";

export const metadata: Metadata = {
  title: "Adicionar empresa",
};

export default async function NewCompanyPage() {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  if (!authState) {
    redirect("/sign-in");
  }

  if (!hasSubscriptionForProtectedApp(billingState)) {
    redirect("/app/billing");
  }

  if (!authState.organization) {
    redirect("/app/onboarding");
  }

  const companies = await readServerCompanies();
  const activeCompanies = companies.filter((company) => company.isActive);

  if (!hasActiveCompany(companies)) {
    redirect("/app/onboarding");
  }

  const planCode =
    billingState?.subscription?.planCode && isBillingPlanCode(billingState.subscription.planCode)
      ? billingState.subscription.planCode
      : "start";
  const companyLimit = BILLING_PLAN_BY_CODE[planCode].cnpjLimit;

  return (
    <CompanyCreationPanel
      companyCount={activeCompanies.length}
      companyLimit={companyLimit}
      organizationName={authState.organization.name}
    />
  );
}
