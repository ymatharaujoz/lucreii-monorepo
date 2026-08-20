import { z } from "zod";
import { createApiSuccessResponseSchema } from "./protected-app";

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,6})?$/, "Informe um número decimal válido.");

const positiveResultString = decimalString.refine(
  (value) => Number(value) > 0,
  "O ROAS precisa ser maior que zero.",
);

const contributionMarginRate = decimalString.refine(
  (value) => Number(value) > 0 && Number(value) <= 1,
  "A margem deve ficar entre 0% e 100%.",
);

const productIdentifier = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim().length === 0 ? null : value,
  z.string().trim().max(255).nullable(),
);

const breakEvenRoasSimulationFields = {
  productIdentifier,
  contributionMarginRate,
};

export const breakEvenRoasSimulationFormSchema = z
  .object(breakEvenRoasSimulationFields)
  .superRefine((value, context) => {
    if (!value.productIdentifier) {
      context.addIssue({
        code: "custom",
        message: "Informe o Nome do Produto ou SKU antes de salvar.",
        path: ["productIdentifier"],
      });
    }
  });

export const breakEvenRoasSimulationUpdateSchema =
  breakEvenRoasSimulationFormSchema;

export const breakEvenRoasSimulationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  sortBy: z
    .enum([
      "productIdentifier",
      "contributionMarginRate",
      "breakEvenRoas",
      "updatedAt",
    ])
    .optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
});

export const breakEvenRoasSimulationBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const breakEvenRoasSimulationSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  ...breakEvenRoasSimulationFields,
  breakEvenRoas: positiveResultString,
  calculationVersion: z.string().trim().min(1).max(32),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const breakEvenRoasSimulationApiResponseSchema =
  createApiSuccessResponseSchema(breakEvenRoasSimulationSchema);

export const breakEvenRoasSimulationListSchema = z.object({
  items: z.array(breakEvenRoasSimulationSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(1),
});

const EMPTY_BREAK_EVEN_ROAS_LIST = {
  items: [],
  page: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 1,
};

function normalizeEmptyBreakEvenRoasResponse(input: unknown) {
  if (input === null || input === undefined || input === "") {
    return { data: EMPTY_BREAK_EVEN_ROAS_LIST, error: null };
  }

  if (Array.isArray(input)) {
    return {
      data: {
        ...EMPTY_BREAK_EVEN_ROAS_LIST,
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
      return { ...payload, data: EMPTY_BREAK_EVEN_ROAS_LIST, error: null };
    }

    if (
      Array.isArray(data) &&
      (payload.error === null || payload.error === undefined)
    ) {
      return {
        ...payload,
        data: {
          ...EMPTY_BREAK_EVEN_ROAS_LIST,
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

export const breakEvenRoasSimulationListApiResponseSchema = z.preprocess(
  normalizeEmptyBreakEvenRoasResponse,
  createApiSuccessResponseSchema(breakEvenRoasSimulationListSchema),
);

export type BreakEvenRoasSimulationFormInput = z.infer<
  typeof breakEvenRoasSimulationFormSchema
>;
export type BreakEvenRoasSimulationUpdateInput = z.infer<
  typeof breakEvenRoasSimulationUpdateSchema
>;
export type BreakEvenRoasSimulationListQueryInput = z.infer<
  typeof breakEvenRoasSimulationListQuerySchema
>;
export type BreakEvenRoasSimulationBulkDeleteInput = z.infer<
  typeof breakEvenRoasSimulationBulkDeleteSchema
>;
