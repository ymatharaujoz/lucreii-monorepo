import { redirect } from "next/navigation";
import { resolveProtectedAppRedirect } from "@/lib/protected-app-route";
import { readServerAuthState } from "@/lib/server-auth";
import { readServerBillingState } from "@/lib/server-billing";
import { hasActiveCompany, readServerCompanies } from "@/lib/server-companies";
import { getActiveCompany } from "@/modules/dashboard/components/company-finance-defaults";
import { PricingCalculator } from "./pricing-calculator";
import type { PricingMode } from "../calculations/pricing-calculations";

export async function PricingPage({ mode }: { mode: PricingMode }) {
  const [authState, billingState] = await Promise.all([
    readServerAuthState(),
    readServerBillingState(),
  ]);

  const redirectTarget = resolveProtectedAppRedirect(authState, billingState);

  if (redirectTarget) {
    redirect(redirectTarget);
  }

  if (!authState) {
    redirect("/sign-in");
  }

  const companies = await readServerCompanies();

  if (!hasActiveCompany(companies)) {
    redirect("/app/onboarding");
  }

  const activeCompany = getActiveCompany(companies);

  if (!authState.selectedCompanyId && activeCompany) {
    redirect(`/auth/auto-select-company?companyId=${activeCompany.id}`);
  }

  return <PricingCalculator mode={mode} />;
}
