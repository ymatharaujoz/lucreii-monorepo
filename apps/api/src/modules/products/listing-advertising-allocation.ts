import { allocateCentsByWeights } from "@/modules/orders/orders.service";

/**
 * A listing shown on the performance screen that may receive Mercado Livre
 * advertising: its advertising key, the Mercado Livre ids that identify it
 * (item id, family id or legacy item id) and its units sold in the month.
 */
export type ListingAdvertisingTarget = {
  advertisingKey: string;
  marketplaceIds: readonly string[];
  sales: number;
};

function toSalesWeight(sales: number) {
  return Number.isFinite(sales) && sales > 0 ? BigInt(Math.round(sales)) : 0n;
}

/**
 * Assigns the cost of each Mercado Livre ad group to the listings it promotes.
 * An ad group (item, family or catalog) may cover several listings; its cost
 * is then split proportionally to the units each listing sold in the month,
 * or evenly when none sold.
 *
 * Returns integer cents per advertising key, only for listings matched by at
 * least one ad group — listings without Mercado Livre data are left out so
 * their manually entered value is preserved.
 */
export function allocateAdGroupCostsToListings(
  adGroupCostsInCents: ReadonlyMap<string, number>,
  targets: readonly ListingAdvertisingTarget[],
): Map<string, number> {
  const targetsByMarketplaceId = new Map<string, ListingAdvertisingTarget[]>();

  for (const target of targets) {
    for (const marketplaceId of new Set(target.marketplaceIds)) {
      const matches = targetsByMarketplaceId.get(marketplaceId) ?? [];
      matches.push(target);
      targetsByMarketplaceId.set(marketplaceId, matches);
    }
  }

  const allocation = new Map<string, number>();

  for (const [externalId, costInCents] of adGroupCostsInCents) {
    const matches = targetsByMarketplaceId.get(externalId);

    if (!matches || matches.length === 0) {
      continue;
    }

    const salesWeights = matches.map((target) => toSalesWeight(target.sales));
    const hasSales = salesWeights.some((weight) => weight > 0n);
    const parts = allocateCentsByWeights(
      BigInt(costInCents),
      hasSales ? salesWeights : matches.map(() => 1n),
    );

    matches.forEach((target, index) => {
      allocation.set(
        target.advertisingKey,
        (allocation.get(target.advertisingKey) ?? 0) + Number(parts[index]),
      );
    });
  }

  return allocation;
}

export function centsToDecimalString(cents: number) {
  return (cents / 100).toFixed(2);
}
