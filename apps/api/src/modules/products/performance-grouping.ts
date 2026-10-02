import type { ProductListItem, ProductPerformanceListItem } from "@lucreii/types";

function indexCatalogProducts(products: ProductListItem[]) {
  const byId = new Map<string, ProductListItem>();
  const visit = (product: ProductListItem) => {
    byId.set(product.id, product);
    product.children.forEach(visit);
  };

  products.forEach(visit);

  return byId;
}

function weightedAverage(
  rows: ProductPerformanceListItem[],
  pick: (row: ProductPerformanceListItem) => number,
  weightOf: (row: ProductPerformanceListItem) => number,
) {
  const totalWeight = rows.reduce((sum, row) => sum + weightOf(row), 0);

  if (totalWeight <= 0) {
    return rows.reduce((sum, row) => sum + pick(row), 0) / rows.length;
  }

  return (
    rows.reduce((sum, row) => sum + pick(row) * weightOf(row), 0) / totalWeight
  );
}

function sumPerformanceRows(
  rows: ProductPerformanceListItem[],
  pick: (row: ProductPerformanceListItem) => number,
) {
  return rows.reduce((sum, row) => sum + pick(row), 0);
}

/**
 * Stable identifier of the listing a performance row belongs to, used to store
 * the advertising entered for it. A grouped marketplace listing is identified
 * by its catalog group key (so it survives variations appearing or vanishing);
 * standalone products fall back to their product id, then their SKU.
 */
export function buildListingAdvertisingKey(
  row: Pick<ProductPerformanceListItem, "catalogGroupKey" | "productId" | "sku">,
) {
  const groupKey = row.catalogGroupKey?.trim();

  if (groupKey) {
    return groupKey;
  }

  if (row.productId) {
    return `product:${row.productId}`;
  }

  const sku = row.sku?.trim().toUpperCase();

  return sku ? `sku:${sku}` : null;
}

export function buildListingAdvertisingLookupKey(input: {
  advertisingKey: string;
  channel: string;
  referenceMonth: string;
}) {
  return [input.referenceMonth, input.channel, input.advertisingKey].join("::");
}

function buildPerformanceGroupKey(
  catalogGroupKey: string,
  row: Pick<ProductPerformanceListItem, "channelLabel" | "referenceMonth">,
) {
  return [catalogGroupKey, row.channelLabel, row.referenceMonth].join("::");
}

/**
 * Collapses variation rows of the same marketplace listing (same catalog
 * group, channel and month) into one parent row carrying the summed metrics.
 * The original rows stay available in `children`. Groups with a single row
 * are left untouched.
 */
export function groupPerformanceRows(
  rows: ProductPerformanceListItem[],
  catalogProducts: ProductListItem[],
): ProductPerformanceListItem[] {
  const byId = indexCatalogProducts(catalogProducts);
  const groups = new Map<string, ProductPerformanceListItem[]>();

  for (const row of rows) {
    if (!row.catalogGroupKey) {
      continue;
    }

    const key = buildPerformanceGroupKey(row.catalogGroupKey, row);
    const members = groups.get(key);

    if (members) {
      members.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const emittedGroups = new Set<string>();

  return rows.flatMap((row) => {
    if (!row.catalogGroupKey) {
      return [row];
    }

    const key = buildPerformanceGroupKey(row.catalogGroupKey, row);
    const members = groups.get(key) ?? [row];

    if (members.length < 2) {
      return [row];
    }

    if (emittedGroups.has(key)) {
      return [];
    }

    emittedGroups.add(key);

    const sortedMembers = [...members].sort((left, right) =>
      (left.variationLabel ?? left.name).localeCompare(
        right.variationLabel ?? right.name,
      ),
    );
    // Advertising belongs to the listing, so every member carries the same
    // value; only the parent row exposes it and variation rows stay read-only.
    const listingAdvertising = sortedMembers[0]!.advertising;
    const children = sortedMembers.map((member) => ({
      ...member,
      advertising: null,
      advertisingKey: null,
    }));
    const first = children[0]!;
    const parentProduct =
      children
        .map((child) =>
          child.parentProductId ? byId.get(child.parentProductId) : undefined,
        )
        .find((product) => product !== undefined) ?? null;
    const parentName = parentProduct?.name?.trim() || first.name;
    const sales = sumPerformanceRows(children, (child) => child.sales);
    const revenue = sumPerformanceRows(children, (child) => child.revenue);
    const netLiquidSales = sumPerformanceRows(
      children,
      (child) => child.netLiquidSales,
    );
    const totalCommission = sumPerformanceRows(
      children,
      (child) => child.totalCommission,
    );
    const totalProductCost = sumPerformanceRows(
      children,
      (child) => child.totalProductCost,
    );
    const totalProfit = sumPerformanceRows(
      children,
      (child) => child.totalProfit,
    );
    const advertisingCost = sumPerformanceRows(
      children,
      (child) => child.advertisingCost,
    );
    const contributionMarginRatio =
      revenue > 0 ? (totalProfit / revenue) * 100 : null;
    const averageBySales = (pick: (child: ProductPerformanceListItem) => number) =>
      weightedAverage(children, pick, (child) => child.sales);
    const groupId = `group:${key}`;

    return [
      {
        actualRoas: advertisingCost > 0 ? revenue / advertisingCost : null,
        adSpend: advertisingCost,
        advertising: listingAdvertising,
        advertisingCost,
        advertisingKey: row.catalogGroupKey,
        catalogGroupKey: row.catalogGroupKey,
        catalogRole: "parent" as const,
        channelLabel: row.channelLabel,
        children,
        commissionPct: revenue > 0 ? (totalCommission / revenue) * 100 : 0,
        contributionMarginRatio,
        coverImageUrl:
          parentProduct?.coverImageUrl ??
          children.find((child) => child.coverImageUrl)?.coverImageUrl ??
          null,
        displayName: parentName,
        id: parentProduct?.id ?? groupId,
        isActive: children.some((child) => child.isActive),
        isSyntheticParent: Boolean(parentProduct?.isSyntheticParent),
        minimumRoas:
          contributionMarginRatio !== null && contributionMarginRatio > 0
            ? 100 / contributionMarginRatio
            : null,
        name: parentName,
        netLiquidSales,
        packagingCost: averageBySales((child) => child.packagingCost),
        parentProductId: null,
        performanceId: groupId,
        productId:
          parentProduct && !parentProduct.isSyntheticParent
            ? parentProduct.id
            : null,
        referenceMonth: row.referenceMonth,
        returns: sumPerformanceRows(children, (child) => child.returns),
        revenue,
        roiRatio:
          totalProductCost > 0 ? (totalProfit / totalProductCost) * 100 : null,
        sales,
        sellingPrice: averageBySales((child) => child.sellingPrice),
        shipping: averageBySales((child) => child.shipping),
        sku: parentProduct?.sku?.trim() || first.sku,
        taxPct: first.taxPct,
        totalCommission,
        totalPackagingCost: sumPerformanceRows(
          children,
          (child) => child.totalPackagingCost,
        ),
        totalProductCost,
        totalProfit,
        unitCost: averageBySales((child) => child.unitCost),
        unitProfit: netLiquidSales > 0 ? totalProfit / netLiquidSales : null,
        variationLabel: null,
      },
    ];
  });
}
