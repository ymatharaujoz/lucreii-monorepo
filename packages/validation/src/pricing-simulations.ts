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
  productSku: optionalIdentifier(128),
  productName: optionalIdentifier(255),
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
    if (!value.productSku && !value.productName) {
      context.addIssue({
        code: "custom",
        message: "Informe o SKU ou o nome do produto para salvar.",
        path: ["productSku"],
      });
    }
  });

export const pricingSimulationUpdateSchema = pricingSimulationFormSchema;

export const pricingSimulationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
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

export const pricingSimulationListApiResponseSchema =
  createApiSuccessResponseSchema(pricingSimulationListSchema);

export type PricingSimulationFormInput = z.infer<
  typeof pricingSimulationFormSchema
>;
export type PricingSimulationUpdateInput = z.infer<
  typeof pricingSimulationUpdateSchema
>;
export type PricingSimulationListQueryInput = z.infer<
  typeof pricingSimulationListQuerySchema
>;
