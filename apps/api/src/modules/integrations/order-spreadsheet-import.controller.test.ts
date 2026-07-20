import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { IntegrationsController } from "./integrations.controller";
import type { IntegrationsService } from "./integrations.service";
import type { OrderSpreadsheetImportService } from "./order-spreadsheet-import.service";

const authContext = {
  organization: { id: "org-1" },
  selectedCompanyId: "company-1",
  user: { id: "user-1" },
} as AuthenticatedRequestContext;

function createController() {
  const importService = {
    importMercadoLivreOrders: vi.fn().mockResolvedValue({
      created: 1,
      errors: [],
      imported: 1,
      pendingFlex: 0,
      provider: "mercadolivre",
      totalRows: 1,
      updated: 0,
      validRows: 1,
    }),
  } as unknown as OrderSpreadsheetImportService;
  return {
    controller: new IntegrationsController(
      {} as IntegrationsService,
      importService,
    ),
    importService,
  };
}

describe("order spreadsheet import endpoint", () => {
  it("imports only Mercado Livre .xlsx files", async () => {
    const { controller, importService } = createController();
    const request = {
      file: vi.fn().mockResolvedValue({
        filename: "vendas.xlsx",
        mimetype:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        toBuffer: vi.fn().mockResolvedValue(Buffer.from("xlsx")),
      }),
    };

    await expect(
      controller.importOrdersSpreadsheet(
        authContext,
        { provider: "mercadolivre" },
        request as never,
      ),
    ).resolves.toEqual({
      data: expect.objectContaining({ imported: 1 }),
      error: null,
    });
    expect(importService.importMercadoLivreOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        buffer: Buffer.from("xlsx"),
        companyId: "company-1",
        organizationId: "org-1",
      }),
    );
  });

  it("rejects an unsupported marketplace before reading a file", async () => {
    const { controller } = createController();
    await expect(
      controller.importOrdersSpreadsheet(
        authContext,
        { provider: "shopee" },
        { file: vi.fn() } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects a file with an invalid MIME type", async () => {
    const { controller } = createController();
    await expect(
      controller.importOrdersSpreadsheet(
        authContext,
        { provider: "mercadolivre" },
        {
          file: vi.fn().mockResolvedValue({
            filename: "vendas.xlsx",
            mimetype: "text/csv",
            toBuffer: vi.fn(),
          }),
        } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
