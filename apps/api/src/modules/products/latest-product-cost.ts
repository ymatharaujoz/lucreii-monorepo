type DatedCost = {
  createdAt: Date | string;
  effectiveFrom: string | null;
};

function toSortKey(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Single source of truth for "which product_costs row is the current cost".
 * Rows are ranked by `effectiveFrom ?? createdAt` (newest first) and ties are
 * broken by `createdAt`. Catalog, orders and finance must all use this so an
 * edit in the catalog always hits the row that profit calculations read.
 */
export function compareProductCostRecency(
  left: DatedCost,
  right: DatedCost,
): number {
  const leftKey = toSortKey(left.effectiveFrom ?? left.createdAt);
  const rightKey = toSortKey(right.effectiveFrom ?? right.createdAt);
  const byRecency = rightKey.localeCompare(leftKey);

  if (byRecency !== 0) {
    return byRecency;
  }

  return toSortKey(right.createdAt).localeCompare(toSortKey(left.createdAt));
}

export function pickLatestProductCost<T extends DatedCost>(
  costs: readonly T[] | null | undefined,
): T | null {
  if (!costs || costs.length === 0) {
    return null;
  }

  return [...costs].sort(compareProductCostRecency)[0] ?? null;
}
