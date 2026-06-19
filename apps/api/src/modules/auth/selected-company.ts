import { BadRequestException } from "@nestjs/common";
import type { AuthenticatedRequestContext } from "./auth.types";

export function requireSelectedCompanyId(
  authContext: AuthenticatedRequestContext,
) {
  if (!authContext.selectedCompanyId) {
    throw new BadRequestException("Selected company required.");
  }

  return authContext.selectedCompanyId;
}
