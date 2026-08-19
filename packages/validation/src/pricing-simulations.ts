import { z } from "zod";
import { createApiSuccessResponseSchema } from "./protected-app";

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,6})?$/, "Informe um número decimal válido.");

const nonNegativeResultString = z
  .string()
  .trim()
  .regex(/^-?\d+(?:\.\d{1,6})?$/, "Resultado decimal inválido.");

const rateString = decimalString.refine(
  (value) => Number(value) >= 0 && Number(value) <= 1,
  "O percentual deve ficar entre 0 e 100%.",
);

function optionalIdentifier(max: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0 ? null : value,
    z.string().trim().max(max).nullable(),
  );
}

const pricingSimulationFields = {
  mode: z.enum(["contribution-margin", "desired-profit", "sale-price"]),
  productIdentifier: optionalIdentifier(255),
  target: decimalString,
  productCost: decimalString,
  packagingCost: decimalString,
  shippingFee: decimalString,
  otherFixedCosts: decimalString,
  marketplaceCommissionRate: rateString,
  taxRate: rateString,
  affiliateCommissionRate: rateString,
  storeCouponRate: rateString,
  otherVariableCostRate: rateString,
};

export const pricingSimulationFormSchema = z
  .object(pricingSimulationFields)
  .superRefine((value, context) => {
    if (!value.productIdentifier) {
      context.addIssue({
        code: "custom",
        message: "Informe o nome do produto ou SKU para salvar.",
        path: ["productIdentifier"],
      });
    }
  });

export const pricingSimulationUpdateSchema = pricingSimulationFormSchema;

export const pricingSimulationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  sortBy: z
    .enum([
      "productIdentifier",
      "mode",
      "recommendedSalePrice",
      "contributionMargin",
      "grossProfit",
      "updatedAt",
    ])
    .optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
});

export const pricingSimulationSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  ...pricingSimulationFields,
  recommendedSalePrice: nonNegativeResultString,
  contributionMargin: nonNegativeResultString,
  grossProfit: nonNegativeResultString,
  fixedCosts: nonNegativeResultString,
  variableRates: nonNegativeResultString,
  calculationVersion: z.string().trim().min(1).max(32),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const pricingSimulationApiResponseSchema =
  createApiSuccessResponseSchema(pricingSimulationSchema);

export const pricingSimulationListSchema = z.object({
  items: z.array(pricingSimulationSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(1),
});

const EMPTY_SIMULATION_LIST = {
  items: [],
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1,
};

function normalizeEmptyPricingSimulationResponse(input: unknown) {
  if (input === null || input === undefined || input === "") {
    return { data: EMPTY_SIMULATION_LIST, error: null };
  }

  if (Array.isArray(input)) {
    return {
      data: {
        ...EMPTY_SIMULATION_LIST,
        items: input,
        totalItems: input.length,
      },
      error: null,
    };
  }

  if (typeof input === "object" && input !== null) {
    const payload = input as Record<string, unknown>;
    const data = payload.data;

    if (
      (data === null || data === undefined || data === "") &&
      (payload.error === null || payload.error === undefined)
    ) {
      return { ...payload, data: EMPTY_SIMULATION_LIST, error: null };
    }

    if (
      Array.isArray(data) &&
      (payload.error === null || payload.error === undefined)
    ) {
      return {
        ...payload,
        data: {
          ...EMPTY_SIMULATION_LIST,
          items: data,
          totalItems: data.length,
        },
        error: null,
      };
    }

    if (
      typeof data === "object" &&
      data !== null &&
      Array.isArray((data as Record<string, unknown>).items) &&
      (payload.error === null || payload.error === undefined)
    ) {
      const list = data as Record<string, unknown>;
      const items = list.items as unknown[];
      const page =
        typeof list.page === "number" && list.page >= 1 ? list.page : 1;
      const pageSize =
        typeof list.pageSize === "number" && list.pageSize >= 1
          ? list.pageSize
          : 10;
      const totalItems =
        typeof list.totalItems === "number" && list.totalItems >= 0
          ? list.totalItems
          : items.length;

      return {
        ...payload,
        data: {
          ...list,
          page,
          pageSize,
          totalItems,
          totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        },
        error: null,
      };
    }
  }

  return input;
}

export const pricingSimulationListApiResponseSchema = z.preprocess(
  normalizeEmptyPricingSimulationResponse,
  createApiSuccessResponseSchema(pricingSimulationListSchema),
);

export type PricingSimulationFormInput = z.infer<
  typeof pricingSimulationFormSchema
>;
export type PricingSimulationUpdateInput = z.infer<
  typeof pricingSimulationUpdateSchema
>;
export type PricingSimulationListQueryInput = z.infer<
  typeof pricingSimulationListQuerySchema
>;
