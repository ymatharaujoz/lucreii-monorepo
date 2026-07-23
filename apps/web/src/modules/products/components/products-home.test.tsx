/** @vitest-environment jsdom */

import React, { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductPerformanceListItem } from "@lucreii/types";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import { ProductsHome } from "./products-home";

const {
  apiClientMocks,
  performanceQueryMock,
  refetchMock,
  refreshMock,
  useProductDataMock,
} = vi.hoisted(() => ({
  apiClientMocks: {
    delete: vi.fn(),
    download: vi.fn(),
    patch: vi.fn(),
  },
  performanceQueryMock: vi.fn(),
  refetchMock: vi.fn(),
  refreshMock: vi.fn(),
  useProductDataMock: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
  }) => React.createElement("img", { alt, src }),
}));

vi.mock("./product-header", () => ({
  ProductHeader: () => <div>Product header</div>,
}));

vi.mock("../calculations/product-insights", () => ({
  buildMarketplaceSyncNotice: () => null,
}));

vi.mock("../hooks/use-product-data", () => ({
  formatReferenceMonthPtBr: () => "junho de 2026",
  useProductData: useProductDataMock,
}));

vi.mock("../hooks/use-product-performance-data", () => ({
  useProductPerformancePage: performanceQueryMock,
}));

useProductDataMock.mockReturnValue({
  data: {
    products: [
      {
        catalogGroupKey: "meli:MLB123",
        catalogRole: "parent",
        coverImageUrl: "https://example.com/product.png",
        createdAt: "2026-06-17T10:00:00.000Z",
        children: [
          {
            catalogGroupKey: "meli:MLB123",
            catalogRole: "child",
            coverImageUrl: "https://example.com/product-variation.png", 
            createdAt: "2026-06-17T10:00:00.000Z", 
            children: [], 
            derivedFromProvider: "mercadolivre", 
            financeDefaults: {
              advertisingCost: "0.00",
              createdAt: "2026-06-17T10:00:00.000Z",
              id: "defaults_2",
              packagingCost: "2.25",
              productId: "product_2",
              updatedAt: "2026-06-17T10:00:00.000Z",
            }, 
            id: "product_2", 
            images: [
              {
                externalIdentifier: null,
                id: "image_2",
                position: 0,
                productId: "product_2",
                source: "manual",
                url: "https://example.com/product-variation.png",
              },
            ], 
            isActive: true, 
            latestCost: {
              amount: "19.00",
              companyId: "company_1",
              costType: "base",
              createdAt: "2026-06-17T10:00:00.000Z",
              currency: "BRL",
              effectiveFrom: null,
              id: "cost_2",
              notes: null,
              organizationId: "org_1",
              productId: "product_2",
              updatedAt: "2026-06-17T10:00:00.000Z",
            }, 
            name: "Kit Mercado Livre - Azul",
            organizationId: "org_1",
            parentProductId: "product_1",
            sellingPrice: "149.90",
            sku: "ML-001-AZ",
            updatedAt: "2026-06-17T10:00:00.000Z",
            variationLabel: "Cor: Azul",
          },
        ], 
        derivedFromProvider: "mercadolivre", 
        financeDefaults: {
          advertisingCost: "0.00",
          createdAt: "2026-06-17T10:00:00.000Z",
          id: "defaults_1",
          packagingCost: "4.50",
          productId: "product_1",
          updatedAt: "2026-06-17T10:00:00.000Z",
        }, 
        id: "product_1",
        images: [
          {
            externalIdentifier: null,
            id: "image_1",
            position: 0,
            productId: "product_1",
            source: "manual",
            url: "https://example.com/product.png",
          },
        ], 
        isActive: true, 
        latestCost: {
          amount: "30.00",
          companyId: "company_1",
          costType: "base",
          createdAt: "2026-06-17T10:00:00.000Z",
          currency: "BRL",
          effectiveFrom: null,
          id: "cost_1",
          notes: null,
          organizationId: "org_1",
          productId: "product_1",
          updatedAt: "2026-06-17T10:00:00.000Z",
        }, 
        name: "Kit Mercado Livre",
        organizationId: "org_1",
        parentProductId: null,
        sellingPrice: "149.90",
        sku: "ML-001",
        updatedAt: "2026-06-17T10:00:00.000Z",
        variationLabel: null,
      },
    ],
    scope: {
      companyId: null,
    },
  },
  error: null,
  financialState: "no-costs",
  goToPage: vi.fn(),
  isLoading: false,
  isUnauthorized: false,
  pagination: { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
  referenceMonth: "2026-06-01",
  referenceMonthSelectOptions: ["2026-06-01"],
  refetch: refetchMock,
  refresh: refreshMock,
  rows: [],
  setReferenceMonth: vi.fn(),
  stats: {
    activeProducts: 1,
    archivedProducts: 0,
    pendingSyncProducts: 0,
    productsWithCost: 0,
    productsWithoutCost: 1,
    syncedProductsTotal: 0,
    totalAdCosts: 0,
    totalManualExpenses: 0,
    totalProductCosts: 0,
    totalProducts: 1,
  },
});

vi.mock("@/lib/api/client", () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  apiClient: apiClientMocks,
}));

function buildPerformanceRow(suffix: string): ProductPerformanceListItem {
  return {
    actualRoas: null,
    adSpend: 0,
    advertisingCost: 0,
    catalogGroupKey: null,
    catalogRole: "standalone",
    children: [],
    channelLabel: "mercadolivre",
    commissionPct: 0,
    contributionMarginRatio: null,
    coverImageUrl: null,
    displayName: `Produto performance ${suffix}`,
    fixedFeeUnit: 0,
    id: `product-${suffix}`,
    isActive: true,
    isSyntheticParent: false,
    marketplaceCommissionUnit: 0,
    minimumRoas: null,
    name: `Produto performance ${suffix}`,
    netLiquidSales: 1,
    packagingCost: 1,
    parentProductId: null,
    performanceId: `performance-${suffix}`,
    productId: `product-${suffix}`,
    referenceMonth: "2026-06-01",
    returns: 0,
    revenue: 100,
    roiRatio: null,
    sales: 1,
    sellingPrice: 100,
    shipping: 0,
    shippingOrFixedFeeSource: "none",
    shippingOrFixedFeeUnit: 0,
    shippingUnit: 0,
    sku: `SKU-${suffix}`,
    taxPct: 0,
    totalCommission: 0,
    totalPackagingCost: 1,
    totalProductCost: 10,
    totalProfit: 89,
    unitCost: 10,
    unitProfit: 89,
    variationLabel: null,
  };
}

function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function click(element: Element) {
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function changeInputValue(element: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(element, value);
  act(() => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function renderProductsHome(view: "catalog" | "performance" = "catalog") {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  return mount(
    <QueryClientProvider client={queryClient}>
      <ProductsHome view={view} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

beforeEach(() => {
  performanceQueryMock.mockReset();
  performanceQueryMock.mockReturnValue({
    data: null,
    error: null,
    isLoading: false,
    isPlaceholderData: false,
  });
  refreshMock.mockReset();
  refetchMock.mockReset();
  apiClientMocks.delete.mockReset();
  apiClientMocks.download.mockReset();
  apiClientMocks.patch.mockReset();
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.stubGlobal(
    "URL",
    Object.assign(globalThis.URL ?? class {}, {
      createObjectURL: vi.fn(() => "blob:catalog"),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("ProductsHome catalog modal", () => { 
  it("keeps catalog table visible when products exist", () => { 
    const view = renderProductsHome(); 
 
    expect(document.body.textContent).toContain("Produtos do cat"); 
    expect(document.body.textContent).toContain("Kit Mercado Livre"); 
    expect(document.body.textContent).not.toContain("Kit Mercado Livre - Azul"); 
    expect(document.body.textContent).not.toContain("Cadastre custos de produto"); 
 
    view.unmount(); 
  }); 

  it("exports filtered catalog rows as xlsx using current search and marketplace filters", async () => {
    apiClientMocks.download.mockResolvedValue(new Blob(["xlsx"]));

    const view = renderProductsHome();

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Filtros"),
      )!,
    );

    const searchInput = document.querySelector('input[placeholder*="Nome ou SKU"]') as HTMLInputElement;
    changeInputValue(searchInput, "Kit");

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("MELI"),
      )!,
    );

    await act(async () => {
      click(
        Array.from(document.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Exportar"),
        )!,
      );
      await Promise.resolve();
    });

    expect(apiClientMocks.download).toHaveBeenCalledWith(
      "/products/export?search=Kit&marketplaces=mercadolivre",
    );
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    view.unmount();
  });

  it("exports only selected real catalog rows and excludes synthetic parents", async () => {
    apiClientMocks.download.mockResolvedValue(new Blob(["xlsx"]));

    const view = renderProductsHome();

    click(
      document.querySelector('input[aria-label="Selecionar Kit Mercado Livre"]')!,
    );

    await act(async () => {
      click(
        Array.from(document.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Exportar selecionados"),
        )!,
      );
      await Promise.resolve();
    });

    expect(apiClientMocks.download).toHaveBeenCalledWith(
      "/products/export?ids=product_1",
    );

    view.unmount();
  });

  it("deletes selected real catalog rows in bulk and clears selection after refresh", async () => {
    apiClientMocks.delete.mockResolvedValue({
      data: {
        ids: ["product_1"],
        totalDeleted: 1,
      },
      error: null,
    });

    const view = renderProductsHome();

    click(
      document.querySelector('input[aria-label="Selecionar Kit Mercado Livre"]')!,
    );

    await act(async () => {
      click(
        Array.from(document.querySelectorAll("button")).find((button) =>
          button.textContent?.includes("Excluir selecionados"),
        )!,
      );
      await Promise.resolve();
    });

    expect(apiClientMocks.delete).toHaveBeenCalledWith("/products/bulk-delete", {
      body: {
        ids: ["product_1"],
      },
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("1 selecionado");

    view.unmount();
  });

  it("opens modal, keeps non-finance fields read-only, saves finance inputs, and deletes product", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: { id: "product_1" },
      error: null,
    });
    apiClientMocks.delete.mockResolvedValue({
      data: { id: "product_1" },
      error: null,
    });

    const view = renderProductsHome();

    click(document.querySelector("tbody tr")!);

    expect(document.body.textContent).toContain("Kit Mercado Livre");
    expect(document.body.textContent).toContain("SKU: ML-001");
    expect(document.body.textContent).toMatch(/R\$\s*149[.,]90/);

    const unitCostInput = document.querySelector('input[name="unitCost"]') as HTMLInputElement;
    const packagingInput = document.querySelector('input[name="packagingCost"]') as HTMLInputElement;

    changeInputValue(unitCostInput, "30.00");
    changeInputValue(packagingInput, "4.50");

    act(() => {
      unitCostInput.dispatchEvent(new Event("focusout", { bubbles: true }));
      packagingInput.dispatchEvent(new Event("focusout", { bubbles: true }));
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Salvar"),
      )!,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/products/product_1/catalog-finance", {
      body: {
        packagingCost: "4.50",
        unitCost: "30.00",
      },
    });
    expect(refreshMock).toHaveBeenCalled();

    click(document.querySelector("tbody tr")!);
    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Excluir produto"),
      )!,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(apiClientMocks.delete).toHaveBeenCalledWith("/products/product_1");

    view.unmount();
  });

  it("submits latest finance values when Enter is pressed before blur", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: { id: "product_1" },
      error: null,
    });

    const view = renderProductsHome();

    click(document.querySelector("tbody tr")!);

    const unitCostInput = document.querySelector('input[name="unitCost"]') as HTMLInputElement;
    const packagingInput = document.querySelector('input[name="packagingCost"]') as HTMLInputElement;

    changeInputValue(unitCostInput, "31.00");
    changeInputValue(packagingInput, "5.25");

    act(() => {
      packagingInput.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }),
      );
      packagingInput.form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/products/product_1/catalog-finance", {
      body: {
        packagingCost: "5.25",
        unitCost: "31.00",
      },
    });

    view.unmount();
  });

  it("expands parent rows to show child variations with own costs and allows saving child finance", async () => {
    apiClientMocks.patch.mockResolvedValue({
      data: { id: "product_2" },
      error: null,
    });

    const view = renderProductsHome();

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.getAttribute("aria-label")?.includes("Expandir"),
      )!,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(document.body.textContent).toContain("Kit Mercado Livre - Azul");
    expect(document.body.textContent).toMatch(/R\$\s*19,00/);
    expect(document.body.textContent).toMatch(/R\$\s*2,25/);

    click(document.querySelector('[data-testid="child-product-row"]')!);

    expect(document.body.textContent).toContain("Informações Financeiras");
    expect(document.body.textContent).toContain(
      "Salvar aqui altera apenas esta varia",
    );

    const unitCostInput = document.querySelector('input[name="unitCost"]') as HTMLInputElement;
    const packagingInput = document.querySelector('input[name="packagingCost"]') as HTMLInputElement;
    expect(unitCostInput.disabled).toBe(false);
    expect(packagingInput.disabled).toBe(false);
    expect(unitCostInput.value).toContain("19");
    expect(packagingInput.value).toContain("2");

    expect(
      Array.from(document.querySelectorAll("button")).some((button) =>
        button.textContent?.includes("Excluir produto"),
      ),
    ).toBe(true);

    changeInputValue(unitCostInput, "21.50");
    changeInputValue(packagingInput, "2.75");

    act(() => {
      unitCostInput.dispatchEvent(new Event("focusout", { bubbles: true }));
      packagingInput.dispatchEvent(new Event("focusout", { bubbles: true }));
    });

    await act(async () => {
      await Promise.resolve();
    });

    click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("Salvar"),
      )!,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiClientMocks.patch).toHaveBeenCalledWith("/products/product_2/catalog-finance", {
      body: {
        packagingCost: "2.75",
        unitCost: "21.50",
      },
    });

    view.unmount();
  });

  it("blocks finance editing and deletion for a synthetic parent catalog row", async () => {
    const useProductData = await import("../hooks/use-product-data");
    vi.mocked(useProductData.useProductData).mockReturnValue({
      data: {
        products: [
          {
            catalogGroupKey: "meli:MLB999",
            catalogRole: "parent",
            companyId: "company_1",
            coverImageUrl: null,
            createdAt: "2026-06-17T10:00:00.000Z",
            children: [],
            derivedFromProvider: "mercadolivre",
            financeDefaults: null,
            id: "synthetic-parent:mercadolivre:MLB999",
            images: [],
            isActive: true,
            isSyntheticParent: true,
            latestCost: null,
            name: "Tenis Run Pro",
            organizationId: "org_1",
            parentProductId: null,
            sellingPrice: "199.90",
            sku: "TENIS-RUN-PRO",
            updatedAt: "2026-06-17T10:00:00.000Z",
            variationLabel: null,
          },
        ],
        scope: {
          companyId: null,
        },
      },
      error: null,
      financialState: "no-costs",
      goToPage: vi.fn(),
      isLoading: false,
      isUnauthorized: false,
      pagination: { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      referenceMonth: "2026-06-01",
      referenceMonthSelectOptions: ["2026-06-01"],
      refetch: refetchMock,
      refresh: refreshMock,
      rows: [],
      setReferenceMonth: vi.fn(),
      stats: {
        activeProducts: 1,
        archivedProducts: 0,
        pendingSyncProducts: 0,
        productsWithCost: 0,
        productsWithoutCost: 1,
        syncedProductsTotal: 0,
        totalAdCosts: 0,
        totalManualExpenses: 0,
        totalProductCosts: 0,
        totalProducts: 1,
      },
    } as never);

    const view = renderProductsHome();

    click(document.querySelector("tbody tr")!);

    const unitCostInput = document.querySelector('input[name="unitCost"]') as HTMLInputElement;
    const packagingInput = document.querySelector('input[name="packagingCost"]') as HTMLInputElement;

    expect(unitCostInput.disabled).toBe(true);
    expect(packagingInput.disabled).toBe(true);
    expect(
      Array.from(document.querySelectorAll("button")).some((button) =>
        button.textContent?.includes("Excluir produto"),
      ),
    ).toBe(false);
    expect(document.body.textContent).toContain("Pai lógico do anúncio");

    view.unmount();
  });

  it("does not allow selecting synthetic parent catalog rows", async () => {
    const useProductData = await import("../hooks/use-product-data");
    vi.mocked(useProductData.useProductData).mockReturnValue({
      data: {
        products: [
          {
            catalogGroupKey: "meli:MLB999",
            catalogRole: "parent",
            companyId: "company_1",
            coverImageUrl: null,
            createdAt: "2026-06-17T10:00:00.000Z",
            children: [],
            derivedFromProvider: "mercadolivre",
            financeDefaults: null,
            id: "synthetic-parent:mercadolivre:MLB999",
            images: [],
            isActive: true,
            isSyntheticParent: true,
            latestCost: null,
            name: "Tenis Run Pro",
            organizationId: "org_1",
            parentProductId: null,
            sellingPrice: "199.90",
            sku: "TENIS-RUN-PRO",
            updatedAt: "2026-06-17T10:00:00.000Z",
            variationLabel: null,
          },
        ],
        scope: {
          companyId: null,
        },
      },
      error: null,
      financialState: "no-costs",
      goToPage: vi.fn(),
      isLoading: false,
      isUnauthorized: false,
      pagination: { currentPage: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      referenceMonth: "2026-06-01",
      referenceMonthSelectOptions: ["2026-06-01"],
      refetch: refetchMock,
      refresh: refreshMock,
      rows: [],
      setReferenceMonth: vi.fn(),
      stats: {
        activeProducts: 1,
        archivedProducts: 0,
        pendingSyncProducts: 0,
        productsWithCost: 0,
        productsWithoutCost: 1,
        syncedProductsTotal: 0,
        totalAdCosts: 0,
        totalManualExpenses: 0,
        totalProductCosts: 0,
        totalProducts: 1,
      },
    } as never);

    const view = renderProductsHome();
    const checkbox = document.querySelector(
      'input[aria-label="Selecionar Tenis Run Pro"]',
    ) as HTMLInputElement;

    expect(checkbox.disabled).toBe(true);

    view.unmount();
  });
});

describe("ProductsHome performance pagination", () => {
  it("renders the rows returned for page 2 and preserves the requested page", () => {
    const pageOneRow = buildPerformanceRow("page-1");
    const pageTwoRow = buildPerformanceRow("page-2");

    performanceQueryMock.mockImplementation((filters: { page?: number }) => {
      const page = filters.page ?? 1;
      const row = page === 2 ? pageTwoRow : pageOneRow;

      return {
        data: {
          items: [row],
          page,
          pageSize: 10,
          totalItems: 11,
          totalPages: 2,
        },
        error: null,
        isLoading: false,
        isPlaceholderData: false,
      };
    });

    const view = renderProductsHome("performance");

    expect(document.body.textContent).toContain("Produto performance page-1");

    const pageTwoButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "2",
    );
    expect(pageTwoButton).toBeDefined();

    click(pageTwoButton!);

    expect(performanceQueryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      true,
    );
    expect(document.body.textContent).toContain("Produto performance page-2");
    expect(document.body.textContent).not.toContain("Produto performance page-1");
    expect(document.body.textContent).toContain("Página 2 de 2");

    view.unmount();
  });
});
