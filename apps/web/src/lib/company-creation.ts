import type { Company } from "@lucreii/types";
import { apiClient } from "@/lib/api/client";

export type CompanyCreationInput = {
  cnpj: string;
  isActive: true;
  razaoSocial: string;
};

async function selectCompany(companyId: string) {
  const response = await fetch("/auth/select-company", {
    body: JSON.stringify({ companyId }),
    headers: {
      "content-type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Could not select company.");
  }
}

export async function createCompanyAndSelect(input: CompanyCreationInput): Promise<Company> {
  const created = await apiClient.post<{ data: Company; error: null }>("/companies", {
    body: input,
  });

  await selectCompany(created.data.id);

  return created.data;
}
