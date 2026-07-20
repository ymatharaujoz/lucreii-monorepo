import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpreadsheetImportCard } from "./spreadsheet-import-card";

describe("SpreadsheetImportCard", () => {
  it("renders Mercado Livre upload, progress result and row errors", () => {
    const markup = renderToStaticMarkup(
      <SpreadsheetImportCard
        provider="mercadolivre"
        file={new File(["xlsx"], "vendas.xlsx")}
        stage="success"
        progress={100}
        result={{
          created: 4,
          errors: [{ message: "Total inválido", row: 18, saleId: "sale-18" }],
          imported: 10,
          pendingFlex: 2,
          provider: "mercadolivre",
          totalRows: 12,
          updated: 6,
          validRows: 11,
        }}
        error={null}
        isPending={false}
        onSelectFile={vi.fn()}
        onImport={vi.fn()}
      />,
    );

    expect(markup).toContain("Importar histórico por planilha");
    expect(markup).toContain("vendas.xlsx");
    expect(markup).toContain("100%");
    expect(markup).toContain("Importados");
    expect(markup).toContain("Flex pendentes");
    expect(markup).toContain("1 ocorrência ficou pendente");
  });

  it("renders the upload and finalization stages without showing completion early", () => {
    const markup = renderToStaticMarkup(
      <SpreadsheetImportCard
        provider="mercadolivre"
        file={new File(["xlsx"], "vendas.xlsx")}
        stage="uploading"
        progress={48}
        result={null}
        error={null}
        isPending={true}
        onSelectFile={vi.fn()}
        onImport={vi.fn()}
      />,
    );

    expect(markup).toContain("Enviando a planilha");
    expect(markup).toContain("48%");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="48"');
    expect(markup).not.toContain("100%");
  });

  it("separates unsupported marketplaces as coming soon", () => {
    const markup = renderToStaticMarkup(
      <SpreadsheetImportCard
        provider="shopee"
        file={null}
        stage="idle"
        progress={0}
        result={null}
        error={null}
        isPending={false}
        onSelectFile={vi.fn()}
        onImport={vi.fn()}
      />,
    );

    expect(markup).toContain("Em breve");
    expect(markup).toContain("modelo de planilha");
  });
});
