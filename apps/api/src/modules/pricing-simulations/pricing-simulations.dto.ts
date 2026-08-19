import {
  pricingSimulationFormSchema,
  pricingSimulationListQuerySchema,
  pricingSimulationUpdateSchema,
} from "@lucreii/validation";
import type {
  PricingSimulationFormInput,
  PricingSimulationListQueryInput,
  PricingSimulationUpdateInput,
} from "@lucreii/validation";

export class CreatePricingSimulationRequestDto implements PricingSimulationFormInput {
  static schema = pricingSimulationFormSchema;

  affiliateCommissionRate!: string;
  marketplaceCommissionRate!: string;
  mode!: PricingSimulationFormInput["mode"];
  otherFixedCosts!: string;
  otherVariableCostRate!: string;
  packagingCost!: string;
  productCost!: string;
  productIdentifier!: string | null;
  shippingFee!: string;
  storeCouponRate!: string;
  target!: string;
  taxRate!: string;
}

export class UpdatePricingSimulationRequestDto implements PricingSimulationUpdateInput {
  static schema = pricingSimulationUpdateSchema;

  affiliateCommissionRate!: string;
  marketplaceCommissionRate!: string;
  mode!: PricingSimulationUpdateInput["mode"];
  otherFixedCosts!: string;
  otherVariableCostRate!: string;
  packagingCost!: string;
  productCost!: string;
  productIdentifier!: string | null;
  shippingFee!: string;
  storeCouponRate!: string;
  target!: string;
  taxRate!: string;
}

export class ListPricingSimulationsQueryDto implements PricingSimulationListQueryInput {
  static schema = pricingSimulationListQuerySchema;

  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: PricingSimulationListQueryInput["sortBy"];
  sortDirection?: PricingSimulationListQueryInput["sortDirection"];
}
