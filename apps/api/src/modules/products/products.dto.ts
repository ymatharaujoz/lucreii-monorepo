import {
  adCostFormSchema,
  adCostUpdateSchema,
  manualExpenseFormSchema,
  manualExpenseUpdateSchema,
  productBulkDeleteSchema,
  productCatalogFinanceUpdateSchema,
  productCostFormSchema,
  productCostUpdateSchema,
  productCatalogExportQuerySchema,
  productFormSchema,
  productAnalyticsQuerySchema,
  productPerformanceListQuerySchema,
  productManualCreateSchema,
  productUpdateSchema,
} from "@lucreii/validation";
import type {
  AdCostFormInput,
  AdCostUpdateInput,
  ManualExpenseFormInput,
  ManualExpenseUpdateInput,
  ProductBulkDeleteInput,
  ProductCatalogFinanceUpdateInput,
  ProductCostFormInput,
  ProductCostUpdateInput,
  ProductCatalogExportQueryInput,
  ProductAnalyticsQueryInput,
  ProductPerformanceListQueryInput,
  ProductFormInput,
  ProductManualCreateInput,
  ProductUpdateInput,
} from "@lucreii/validation";

export class CreateProductRequestDto implements ProductFormInput {
  static schema = productFormSchema;

  isActive!: boolean;
  name!: string;
  sellingPrice!: string;
  sku!: string | null;
}

export class UpdateProductRequestDto implements ProductUpdateInput {
  static schema = productUpdateSchema;

  isActive?: boolean;
  name?: string;
  sellingPrice?: string;
  sku?: string | null;
}

export class CreateManualProductRequestDto implements ProductManualCreateInput {
  static schema = productManualCreateSchema;

  initialFinance!: {
    packagingCost: string;
    unitCost: string;
  };

  product!: {
    isActive: boolean;
    name: string;
    sellingPrice: string;
    sku: string;
  };
}

export class ProductAnalyticsQueryDto implements ProductAnalyticsQueryInput {
  static schema = productAnalyticsQuerySchema;

  companyId?: string;
  referenceMonth?: string;
}

export class ProductPerformanceListQueryDto
  implements ProductPerformanceListQueryInput
{
  static schema = productPerformanceListQuerySchema;

  marketplaces?: Array<"mercadolivre" | "shopee" | "shein">;
  page?: number;
  pageSize?: number;
  referenceMonth?: string;
  search?: string;
  sortBy?:
    | "channelLabel"
    | "parentName"
    | "variationName"
    | "sales"
    | "sellingPrice"
    | "contributionMarginRatio"
    | "totalProfit";
  sortDirection?: "asc" | "desc";
}

export class ProductCatalogExportQueryDto
  implements ProductCatalogExportQueryInput
{
  static schema = productCatalogExportQuerySchema;

  ids?: string[];
  marketplaces?: Array<"mercadolivre" | "shopee" | "shein">;
  search?: string;
}

export class ProductBulkDeleteRequestDto implements ProductBulkDeleteInput {
  static schema = productBulkDeleteSchema;

  ids!: string[];
}

export class UpdateProductCatalogFinanceRequestDto
  implements ProductCatalogFinanceUpdateInput
{
  static schema = productCatalogFinanceUpdateSchema;

  packagingCost!: string;
  unitCost!: string;
}

export class CreateProductCostRequestDto implements ProductCostFormInput {
  static schema = productCostFormSchema;

  amount!: string;
  costType!: string;
  currency!: string;
  effectiveFrom!: string | null;
  notes!: string | null;
  productId!: string;
}

export class UpdateProductCostRequestDto implements ProductCostUpdateInput {
  static schema = productCostUpdateSchema;

  amount?: string;
  costType?: string;
  currency?: string;
  effectiveFrom?: string | null;
  notes?: string | null;
  productId?: string;
}

export class CreateAdCostRequestDto implements AdCostFormInput {
  static schema = adCostFormSchema;

  amount!: string;
  channel!: string;
  currency!: string;
  notes!: string | null;
  productId!: string | null;
  spentAt!: string | null;
}

export class UpdateAdCostRequestDto implements AdCostUpdateInput {
  static schema = adCostUpdateSchema;

  amount?: string;
  channel?: string;
  currency?: string;
  notes?: string | null;
  productId?: string | null;
  spentAt?: string | null;
}

export class CreateManualExpenseRequestDto implements ManualExpenseFormInput {
  static schema = manualExpenseFormSchema;

  amount!: string;
  category!: string;
  currency!: string;
  incurredAt!: string | null;
  notes!: string | null;
}

export class UpdateManualExpenseRequestDto implements ManualExpenseUpdateInput {
  static schema = manualExpenseUpdateSchema;

  amount?: string;
  category?: string;
  currency?: string;
  incurredAt?: string | null;
  notes?: string | null;
}
