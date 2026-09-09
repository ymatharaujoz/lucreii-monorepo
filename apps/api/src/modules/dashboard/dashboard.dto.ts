import { dashboardMarketplaceAdvertisingUpdateSchema } from "@lucreii/validation";
import type { DashboardMarketplaceAdvertisingUpdateInput } from "@lucreii/validation";

export class UpdateDashboardMarketplaceAdvertisingRequestDto implements DashboardMarketplaceAdvertisingUpdateInput {
  static schema = dashboardMarketplaceAdvertisingUpdateSchema;

  amount!: string;
  provider!: DashboardMarketplaceAdvertisingUpdateInput["provider"];
  referenceMonth!: string;
}
