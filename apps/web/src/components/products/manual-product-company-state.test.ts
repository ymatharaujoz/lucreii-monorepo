import { describe, expect, it } from "vitest";
import {
  getCatalogCompanyRequirementMessage,
  getManualProductCompanyValidationMessage,
  resolveManualProductCompanyState,
} from "./manual-product-company-state";

describe("manual product company state", () => {
  it("blocks the flow when no active companies exist", () => {
    expect(
      resolveManualProductCompanyState({
        companies: [],
        preferredCompanyId: null,
      }),
    ).toEqual({
      activeCompanies: [],
      blockingMessage:
        "Cadastre uma empresa ativa antes de salvar um produto manual com custos e impostos mensais.",
      requiresExplicitSelection: false,
      selectedCompanyId: "",
    });
  });

  it("preselects the only active company", () => {
    expect(
      resolveManualProductCompanyState({
        companies: [
          {
            cnpj: "12345678000195",
            code: "MAIN",
            createdAt: "2026-05-15T10:00:00.000Z",
            fixedCostDefault: "0.00",
            id: "company_1",
            isActive: true,
            isSelected: false,
            razaoSocial: "Empresa Principal LTDA",
            taxRateDefault: "0.000000",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
        preferredCompanyId: null,
      }),
    ).toEqual(
      expect.objectContaining({
        blockingMessage: null,
        requiresExplicitSelection: false,
        selectedCompanyId: "company_1",
      }),
    );
  });

  it("requires explicit selection when multiple active companies exist", () => {
    expect(
      resolveManualProductCompanyState({
        companies: [
          {
            cnpj: "12345678000195",
            code: "MAIN",
            createdAt: "2026-05-15T10:00:00.000Z",
            fixedCostDefault: "0.00",
            id: "company_1",
            isActive: true,
            isSelected: false,
            razaoSocial: "Empresa Principal LTDA",
            taxRateDefault: "0.000000",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
          {
            cnpj: "11222333000181",
            code: "SHOP",
            createdAt: "2026-05-15T10:00:00.000Z",
            fixedCostDefault: "0.00",
            id: "company_2",
            isActive: true,
            isSelected: false,
            razaoSocial: "Filial Shop LTDA",
            taxRateDefault: "0.000000",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
        preferredCompanyId: null,
      }),
    ).toEqual(
      expect.objectContaining({
        blockingMessage: null,
        requiresExplicitSelection: true,
        selectedCompanyId: "",
      }),
    );
  });

  it("rejects submit when no company is selected", () => {
    expect(
      getManualProductCompanyValidationMessage({
        companies: [
          {
            cnpj: "12345678000195",
            code: "MAIN",
            createdAt: "2026-05-15T10:00:00.000Z",
            fixedCostDefault: "0.00",
            id: "company_1",
            isActive: true,
            isSelected: false,
            razaoSocial: "Empresa Principal LTDA",
            taxRateDefault: "0.000000",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
          {
            cnpj: "11222333000181",
            code: "SHOP",
            createdAt: "2026-05-15T10:00:00.000Z",
            fixedCostDefault: "0.00",
            id: "company_2",
            isActive: true,
            isSelected: false,
            razaoSocial: "Filial Shop LTDA",
            taxRateDefault: "0.000000",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
        companyId: "",
      }),
    ).toBe(
      "Selecione a empresa que deve receber os custos e impostos mensais deste produto.",
    );
  });

  it("requires selected company when multiple active companies exist for catalog actions", () => {
    expect(getCatalogCompanyRequirementMessage(0)).toBe(
      "Cadastre uma empresa ativa em /app antes de criar ou importar produtos.",
    );
    expect(getCatalogCompanyRequirementMessage(1)).toBeNull();
    expect(getCatalogCompanyRequirementMessage(2, null)).toBe(
      "Selecione a empresa ativa que deve receber produtos e importacoes.",
    );
    expect(getCatalogCompanyRequirementMessage(2, "company_2")).toBeNull();
  });

  it("uses preferred or selected company when multiple active companies exist", () => {
    expect(
      resolveManualProductCompanyState({
        companies: [
          {
            cnpj: "12345678000195",
            code: "MAIN",
            createdAt: "2026-05-15T10:00:00.000Z",
            fixedCostDefault: "0.00",
            id: "company_1",
            isActive: true,
            isSelected: false,
            razaoSocial: "Empresa Principal LTDA",
            taxRateDefault: "0.000000",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
          {
            cnpj: "11222333000181",
            code: "SHOP",
            createdAt: "2026-05-15T10:00:00.000Z",
            fixedCostDefault: "0.00",
            id: "company_2",
            isActive: true,
            isSelected: true,
            razaoSocial: "Filial Shop LTDA",
            taxRateDefault: "0.000000",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
        preferredCompanyId: null,
      }),
    ).toEqual(
      expect.objectContaining({
        requiresExplicitSelection: false,
        selectedCompanyId: "company_2",
      }),
    );
  });
});
