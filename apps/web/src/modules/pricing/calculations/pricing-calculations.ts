export type PricingMode =
  | "contribution-margin"
  | "desired-profit"
  | "sale-price";

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

const RATE_FIELDS: PricingField[] = [
  "marketplaceCommissionRate",
  "taxRate",
  "affiliateCommissionRate",
  "storeCouponRate",
  "otherVariableCostRate",
];

const COST_FIELDS: PricingField[] = [
  "productCost",
  "packagingCost",
  "shippingFee",
  "otherFixedCosts",
];

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function validateInputs(
  mode: PricingMode,
  inputs: PricingInputs,
): PricingError[] {
  const errors: PricingError[] = [];

  for (const field of [...COST_FIELDS, "target" as PricingField]) {
    const value = inputs[field];

    if (!isFiniteNumber(value)) {
      errors.push({
        code: "invalid-number",
        field,
        message: "Informe um número válido.",
      });
      continue;
    }

    if (value < 0) {
      errors.push({
        code: "negative-value",
        field,
        message: "Use um valor igual ou maior que zero.",
      });
    }
  }

  for (const field of RATE_FIELDS) {
    const value = inputs[field];

    if (!isFiniteNumber(value) || value < 0 || value > 1) {
      errors.push({
        code: "invalid-rate",
        field,
        message: "Informe um percentual entre 0% e 100%.",
      });
    }
  }

  if (mode === "contribution-margin" && inputs.target > 1) {
    errors.push({
      code: "invalid-target",
      field: "target",
      message: "A margem alvo deve estar entre 0% e 100%.",
    });
  }

  if (mode === "sale-price" && inputs.target <= 0) {
    errors.push({
      code: "invalid-price",
      field: "target",
      message: "Informe um preço de venda maior que zero.",
    });
  }

  return errors;
}

export function calculatePricing(
  mode: PricingMode,
  inputs: PricingInputs,
): PricingCalculation {
  const validationErrors = validateInputs(mode, inputs);

  if (validationErrors.length > 0) {
    return { errors: validationErrors, ok: false };
  }

  const fixedCosts = COST_FIELDS.reduce(
    (total, field) => total + inputs[field],
    0,
  );
  const variableRates = RATE_FIELDS.reduce(
    (total, field) => total + inputs[field],
    0,
  );

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
            message:
              "A soma dos custos percentuais precisa ser menor que 100%.",
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

  const grossProfit = recommendedSalePrice * contributionMargin;

  if (
    !isFiniteNumber(recommendedSalePrice) ||
    !isFiniteNumber(contributionMargin) ||
    !isFiniteNumber(grossProfit)
  ) {
    return {
      errors: [
        {
          code: "invalid-number",
          message:
            "Não foi possível calcular um resultado válido com esses dados.",
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
      grossProfit,
      recommendedSalePrice,
      variableRates,
    },
  };
}
