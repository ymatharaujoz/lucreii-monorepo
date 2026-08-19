import type { PricingSimulationMode } from "@lucreii/types";

export const PRICING_FORMULA_VERSION = "1";

export type PricingMode = PricingSimulationMode;

export type PricingInputs = {
  target: number;
  productCost: number;
  packagingCost: number;
  shippingFee: number;
  otherFixedCosts: number;
  marketplaceCommissionRate: number;
  taxRate: number;
  affiliateCommissionRate: number;
  storeCouponRate: number;
  otherVariableCostRate: number;
};

export type PricingField = keyof PricingInputs;

export type PricingError = {
  field?: PricingField;
  code:
    | "invalid-number"
    | "negative-value"
    | "invalid-rate"
    | "invalid-target"
    | "invalid-price"
    | "invalid-denominator";
  message: string;
};

export type PricingResult = {
  recommendedSalePrice: number;
  contributionMargin: number;
  grossProfit: number;
  fixedCosts: number;
  variableRates: number;
};

export type PricingCalculation =
  | { ok: true; result: PricingResult }
  | { ok: false; errors: PricingError[] };

const COST_FIELDS: PricingField[] = [
  "productCost",
  "packagingCost",
  "shippingFee",
  "otherFixedCosts",
];

const RATE_FIELDS: PricingField[] = [
  "marketplaceCommissionRate",
  "taxRate",
  "affiliateCommissionRate",
  "storeCouponRate",
  "otherVariableCostRate",
];

const ALL_FIELDS: PricingField[] = [...COST_FIELDS, ...RATE_FIELDS, "target"];

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

export function calculatePricing(
  mode: PricingMode,
  inputs: PricingInputs,
): PricingCalculation {
  const errors: PricingError[] = [];

  for (const field of ALL_FIELDS) {
    if (!isFiniteNumber(inputs[field])) {
      errors.push({
        code: "invalid-number",
        field,
        message: "Informe um número válido.",
      });
    }
  }

  for (const field of COST_FIELDS) {
    if (isFiniteNumber(inputs[field]) && inputs[field] < 0) {
      errors.push({
        code: "negative-value",
        field,
        message: "Custos não podem ser negativos.",
      });
    }
  }

  for (const field of RATE_FIELDS) {
    if (
      isFiniteNumber(inputs[field]) &&
      (inputs[field] < 0 || inputs[field] > 1)
    ) {
      errors.push({
        code: "invalid-rate",
        field,
        message: "Use um percentual entre 0% e 100%.",
      });
    }
  }

  if (mode === "contribution-margin") {
    if (inputs.target < 0 || inputs.target > 1) {
      errors.push({
        code: "invalid-target",
        field: "target",
        message: "A margem alvo deve ficar entre 0% e 100%.",
      });
    }
  } else if (mode === "desired-profit" && inputs.target < 0) {
    errors.push({
      code: "invalid-target",
      field: "target",
      message: "O lucro desejado não pode ser negativo.",
    });
  } else if (mode === "sale-price" && inputs.target <= 0) {
    errors.push({
      code: "invalid-price",
      field: "target",
      message: "O preço de venda deve ser maior que zero.",
    });
  }

  if (errors.length > 0) {
    return { errors, ok: false };
  }

  const fixedCosts =
    inputs.productCost +
    inputs.packagingCost +
    inputs.shippingFee +
    inputs.otherFixedCosts;
  const variableRates =
    inputs.marketplaceCommissionRate +
    inputs.taxRate +
    inputs.affiliateCommissionRate +
    inputs.storeCouponRate +
    inputs.otherVariableCostRate;

  let recommendedSalePrice: number;
  let contributionMargin: number;

  if (mode === "contribution-margin") {
    const denominator = 1 - variableRates - inputs.target;

    if (denominator <= 0) {
      return {
        errors: [
          {
            code: "invalid-denominator",
            field: "target",
            message:
              "A soma da margem e dos custos percentuais precisa ser menor que 100%.",
          },
        ],
        ok: false,
      };
    }

    recommendedSalePrice = fixedCosts / denominator;
    contributionMargin = inputs.target;
  } else if (mode === "desired-profit") {
    const denominator = 1 - variableRates;

    if (denominator <= 0) {
      return {
        errors: [
          {
            code: "invalid-denominator",
            field: "target",
            message: "A soma dos custos variáveis precisa ser menor que 100%.",
          },
        ],
        ok: false,
      };
    }

    recommendedSalePrice = (inputs.target + fixedCosts) / denominator;
    contributionMargin =
      (recommendedSalePrice -
        fixedCosts -
        recommendedSalePrice * variableRates) /
      recommendedSalePrice;
  } else {
    recommendedSalePrice = inputs.target;
    contributionMargin = 1 - fixedCosts / recommendedSalePrice - variableRates;
  }

  if (!isFiniteNumber(recommendedSalePrice) || recommendedSalePrice <= 0) {
    return {
      errors: [
        {
          code: "invalid-denominator",
          field: "target",
          message: "Não foi possível encontrar um preço de venda válido.",
        },
      ],
      ok: false,
    };
  }

  return {
    ok: true,
    result: {
      contributionMargin,
      fixedCosts,
      grossProfit: recommendedSalePrice * contributionMargin,
      recommendedSalePrice,
      variableRates,
    },
  };
}
