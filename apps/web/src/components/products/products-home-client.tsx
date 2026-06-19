"use client";

import { ProductsHome } from "@/modules/products";
import { useProductsActions } from "./products-actions-context";

export function ProductsHomeClient({
  view,
}: {
  view: "catalog" | "performance";
}) {
  const { handleAddProduct, handleImportProducts } = useProductsActions();
  return (
    <ProductsHome
      view={view}
      onAddProduct={handleAddProduct}
      onImportProducts={handleImportProducts}
    />
  );
}
