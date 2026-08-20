import {
  breakEvenRoasSimulationBulkDeleteSchema,
  breakEvenRoasSimulationFormSchema,
  breakEvenRoasSimulationListQuerySchema,
  breakEvenRoasSimulationUpdateSchema,
} from "@lucreii/validation";
import type {
  BreakEvenRoasSimulationBulkDeleteInput,
  BreakEvenRoasSimulationFormInput,
  BreakEvenRoasSimulationListQueryInput,
  BreakEvenRoasSimulationUpdateInput,
} from "@lucreii/validation";

export class CreateBreakEvenRoasSimulationRequestDto implements BreakEvenRoasSimulationFormInput {
  static schema = breakEvenRoasSimulationFormSchema;

  contributionMarginRate!: string;
  productIdentifier!: string | null;
}

export class UpdateBreakEvenRoasSimulationRequestDto implements BreakEvenRoasSimulationUpdateInput {
  static schema = breakEvenRoasSimulationUpdateSchema;

  contributionMarginRate!: string;
  productIdentifier!: string | null;
}

export class ListBreakEvenRoasSimulationsQueryDto implements BreakEvenRoasSimulationListQueryInput {
  static schema = breakEvenRoasSimulationListQuerySchema;

  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: BreakEvenRoasSimulationListQueryInput["sortBy"];
  sortDirection?: BreakEvenRoasSimulationListQueryInput["sortDirection"];
}

export class DeleteBreakEvenRoasSimulationsBulkRequestDto implements BreakEvenRoasSimulationBulkDeleteInput {
  static schema = breakEvenRoasSimulationBulkDeleteSchema;

  ids!: string[];
}
