import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { DatabaseClient, MarketplaceConnection } from "@lucreii/database";
import {
  externalFees,
  externalOrderItems,
  externalOrders,
  externalProducts,
  marketplaceConnections,
} from "@lucreii/database";
import type {
  OrderImportRowError,
  OrderSpreadsheetImportResult,
} from "@lucreii/types";
import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { API_RUNTIME_ENV, DATABASE_CLIENT } from "@/common/tokens";
import { MercadoLivreProvider } from "./providers/mercadolivre.provider";

type SpreadsheetCell = string | number | boolean | Date | null | undefined;

type ParsedItem = {
  externalProductId: string;
  quantity: number;
  sku: string | null;
  title: string;
  unitPrice: number;
};

type ParsedOrder = {
  commissionAmount: number;
  discountAmount: number;
  flex: boolean;
  items: ParsedItem[];
  orderedAt: Date;
  packageInfo?: {
    childSaleIds: string[];
    declaredItemCount: number;
  };
  productRevenueAmount: number;
  saleId: string;
  shippingAmount: number | null;
  status: string;
  totalAmount: number;
  sourceRow: number;
};

type HeaderKey =
  | "commission"
  | "date"
  | "discount"
  | "productRevenue"
  | "revenueShipping"
  | "saleId"
  | "shipping"
  | "sku"
  | "status"
  | "title"
  | "total"
  | "unitPrice"
  | "units";

type SpreadsheetRecord = Record<HeaderKey, SpreadsheetCell>;

type MarketplaceConnectionIssue =
  | "missing"
  | "disconnected"
  | "missing_token"
  | "refresh_failed";

type PreparedMarketplaceConnection = {
  connection: MarketplaceConnection | null;
  issue: MarketplaceConnectionIssue | null;
};

const HEADER_ALIASES: Record<HeaderKey, string[]> = {
  commission: ["TARIFA DE VENDA E IMPOSTOS BRL"],
  date: ["DATA DA VENDA"],
  discount: ["DESCONTOS E BONUS", "DESCONTOS E BÔNUS"],
  productRevenue: ["RECEITA POR PRODUTOS BRL"],
  revenueShipping: ["RECEITA POR ENVIO BRL"],
  saleId: ["N VENDA", "N DE VENDA", "NUMERO DE VENDA", "Nº DE VENDA"],
  shipping: ["TARIFAS DE ENVIO BRL"],
  sku: ["SKU"],
  status: ["ESTADO"],
  title: ["TITULO DO ANUNCIO", "TITULO DO ANÚNCIO"],
  total: ["TOTAL BRL"],
  unitPrice: ["PRECO UNITARIO DE VENDA DO ANUNCIO BRL"],
  units: ["UNIDADES"],
};

const REQUIRED_HEADERS: HeaderKey[] = [
  "saleId",
  "status",
  "date",
  "total",
  "title",
  "unitPrice",
  "units",
];

const MONTHS: Record<string, number> = {
  abril: 4,
  agosto: 8,
  dezembro: 12,
  fevereiro: 2,
  janeiro: 1,
  julho: 7,
  junho: 6,
  marco: 3,
  maio: 5,
  novembro: 11,
  outubro: 10,
  setembro: 9,
};

function normalizeHeader(value: SpreadsheetCell) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toUpperCase();
}

function hasCellValue(value: SpreadsheetCell) {
  return !(
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
}

function parseMoney(value: SpreadsheetCell): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  }

  if (!hasCellValue(value)) {
    return null;
  }

  const raw = String(value)
    .trim()
    .replace(/R\$|BRL/gi, "")
    .replace(/\s/g, "");
  const negative =
    raw.startsWith("-") || (raw.startsWith("(") && raw.endsWith(")"));
  const unsigned = raw.replace(/[()\-+]/g, "");
  const normalized = unsigned.includes(",")
    ? unsigned.replace(/\./g, "").replace(",", ".")
    : unsigned.replace(/,/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  const amount = Math.round(parsed * 100) / 100;
  return negative ? -amount : amount;
}

function parseInteger(value: SpreadsheetCell): number | null {
  const parsed = parseMoney(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function parseDate(value: SpreadsheetCell): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const dateCode = XLSX.SSF.parse_date_code(value);
    if (dateCode) {
      const date = new Date(
        Date.UTC(
          dateCode.y,
          dateCode.m - 1,
          dateCode.d,
          dateCode.H,
          dateCode.M,
          Math.floor(dateCode.S),
        ),
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const portuguese = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(
      /^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s+hs?\.?)?)?$/i,
    );
  if (portuguese) {
    const month = MONTHS[portuguese[2].toLowerCase()];
    if (month) {
      const date = new Date(
        Date.UTC(
          Number(portuguese[3]),
          month - 1,
          Number(portuguese[1]),
          Number(portuguese[4] ?? 12),
          Number(portuguese[5] ?? 0),
          Number(portuguese[6] ?? 0),
        ),
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function externalProductId(sku: string | null, title: string) {
  const identity = sku?.trim().toUpperCase() || title.trim().toUpperCase();
  const digest = createHash("sha256")
    .update(identity)
    .digest("hex")
    .slice(0, 24);
  return `spreadsheet:mercadolivre:${digest}`;
}

function normalizeImportedStatus(status: string) {
  const normalized = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("cancel")) {
    return "cancelled";
  }

  if (
    normalized.includes("devol") ||
    normalized.includes("reembols") ||
    (normalized.includes("mediacao") && normalized.includes("dinheiro"))
  ) {
    return "partially_refunded";
  }

  if (
    normalized.includes("entreg") ||
    normalized.includes("atras") ||
    normalized.includes("nao entregue") ||
    normalized.includes("pacote de")
  ) {
    return "paid";
  }

  return "confirmed";
}

function findColumn(headers: string[], key: HeaderKey) {
  const aliases = HEADER_ALIASES[key].map(normalizeHeader);
  const exact = headers.findIndex((header) => aliases.includes(header));
  if (exact >= 0) {
    return exact;
  }

  if (key === "saleId") {
    return headers.findIndex(
      (header) => header.includes("VENDA") && header.startsWith("N"),
    );
  }

  return -1;
}

function findHeaderRow(rows: SpreadsheetCell[][]) {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const headers = rows[rowIndex].map(normalizeHeader);
    const matches = REQUIRED_HEADERS.filter(
      (key) => findColumn(headers, key) >= 0,
    );
    if (matches.length === REQUIRED_HEADERS.length) {
      return { headers, rowIndex };
    }
  }

  return null;
}

function readRecord(
  row: SpreadsheetCell[],
  headers: string[],
): SpreadsheetRecord {
  const record = {} as SpreadsheetRecord;
  for (const key of Object.keys(HEADER_ALIASES) as HeaderKey[]) {
    const column = findColumn(headers, key);
    record[key] = column >= 0 ? row[column] : null;
  }
  return record;
}

function readPackageItemCount(status: string) {
  const match = status.match(/^Pacote de (\d+) produtos$/i);
  if (!match) {
    return null;
  }

  const count = Number(match[1]);
  return Number.isInteger(count) && count > 0 ? count : null;
}

function parsePackageItem(
  record: SpreadsheetRecord,
  rowError: (message: string) => void,
) {
  const saleId = String(record.saleId ?? "").trim();
  const title = String(record.title ?? "").trim();
  const unitPrice = parseMoney(record.unitPrice);
  const quantity = parseInteger(record.units);

  if (!saleId) rowError("N.\u00ba de venda n\u00e3o informado.");
  if (!title) rowError("T\u00edtulo do an\u00fancio n\u00e3o informado.");
  if (unitPrice === null)
    rowError("Pre\u00e7o unit\u00e1rio de venda inv\u00e1lido.");
  if (quantity === null || quantity <= 0) {
    rowError("Unidades deve ser um inteiro positivo.");
  }

  if (!title || unitPrice === null || quantity === null || quantity <= 0) {
    return null;
  }

  const sku = hasCellValue(record.sku) ? String(record.sku).trim() : null;
  return {
    externalProductId: externalProductId(sku, title),
    quantity,
    sku,
    title,
    unitPrice,
  } satisfies ParsedItem;
}

function parseRows(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { cellDates: true, raw: true });
  const allRows: SpreadsheetCell[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheetRows = XLSX.utils.sheet_to_json<SpreadsheetCell[]>(
      workbook.Sheets[sheetName],
      {
        header: 1,
        defval: "",
        raw: true,
      },
    );
    allRows.push(...sheetRows);
  }

  const header = findHeaderRow(allRows);
  if (!header) {
    throw new BadRequestException(
      "Não foi possível localizar o cabeçalho de vendas do Mercado Livre.",
    );
  }

  const errors: OrderImportRowError[] = [];
  const orders = new Map<string, ParsedOrder>();
  let totalRows = 0;

  for (let index = header.rowIndex + 1; index < allRows.length; index += 1) {
    const sourceRow = index + 1;
    const record = readRecord(allRows[index], header.headers);
    if (!Object.values(record).some(hasCellValue)) {
      continue;
    }
    totalRows += 1;

    const saleId = String(record.saleId ?? "").trim();
    const status = String(record.status ?? "").trim();
    const orderedAt = parseDate(record.date);
    const totalAmount = parseMoney(record.total);
    const title = String(record.title ?? "").trim();
    const unitPrice = parseMoney(record.unitPrice);
    const quantity = parseInteger(record.units);
    const rowError = (message: string) =>
      errors.push({ message, row: sourceRow, saleId: saleId || null });

    const declaredPackageItems = readPackageItemCount(status);
    const packageItemCount =
      declaredPackageItems !== null &&
      !title &&
      unitPrice === null &&
      (quantity === null || quantity <= 0)
        ? declaredPackageItems
        : null;
    if (packageItemCount !== null) {
      if (!saleId) rowError("N.\u00ba de venda n\u00e3o informado.");
      if (!status) rowError("Estado n\u00e3o informado.");
      if (!orderedAt) rowError("Data da venda inv\u00e1lida.");
      if (totalAmount === null) rowError("Total (BRL) inv\u00e1lido.");

      const items: ParsedItem[] = [];
      const childSaleIds: string[] = [];
      let childIndex = index + 1;
      let consumedChildren = 0;

      while (
        consumedChildren < packageItemCount &&
        childIndex < allRows.length
      ) {
        const childRecord = readRecord(allRows[childIndex], header.headers);
        if (!Object.values(childRecord).some(hasCellValue)) {
          childIndex += 1;
          continue;
        }

        if (hasCellValue(childRecord.total)) {
          break;
        }

        totalRows += 1;
        const childSourceRow = childIndex + 1;
        const childSaleId = String(childRecord.saleId ?? "").trim();
        const childRowError = (message: string) =>
          errors.push({
            message,
            row: childSourceRow,
            saleId: childSaleId || null,
          });
        const item = parsePackageItem(childRecord, childRowError);

        if (childSaleId) {
          childSaleIds.push(childSaleId);
        }
        if (item) {
          items.push(item);
        }

        consumedChildren += 1;
        childIndex += 1;
      }

      if (consumedChildren < packageItemCount) {
        rowError(
          `Pacote declara ${packageItemCount} produtos, mas apenas ${consumedChildren} linha(s) filha(s) foram encontrada(s).`,
        );
      }

      index = childIndex - 1;
      if (!saleId || !status || !orderedAt || totalAmount === null) {
        continue;
      }

      const productRevenueAmount =
        parseMoney(record.productRevenue) ?? totalAmount;
      const discountFilled = hasCellValue(record.discount);
      const shippingFilled = hasCellValue(record.shipping);
      const revenueShippingFilled = hasCellValue(record.revenueShipping);
      const discountAmount = Math.abs(parseMoney(record.discount) ?? 0);
      const shippingTariff = Math.abs(parseMoney(record.shipping) ?? 0);
      const revenueShipping = Math.abs(parseMoney(record.revenueShipping) ?? 0);

      orders.set(saleId, {
        commissionAmount: Math.abs(parseMoney(record.commission) ?? 0),
        discountAmount,
        flex: discountFilled && !shippingFilled && !revenueShippingFilled,
        items,
        orderedAt,
        packageInfo: {
          childSaleIds,
          declaredItemCount: packageItemCount,
        },
        productRevenueAmount,
        saleId,
        shippingAmount:
          shippingFilled || revenueShippingFilled
            ? shippingTariff - revenueShipping
            : null,
        sourceRow,
        status,
        totalAmount,
      });
      continue;
    }

    if (!saleId) rowError("N.º de venda não informado.");
    if (!status) rowError("Estado não informado.");
    if (!orderedAt) rowError("Data da venda inválida.");
    if (totalAmount === null) rowError("Total (BRL) inválido.");
    if (!title) rowError("Título do anúncio não informado.");
    if (unitPrice === null) rowError("Preço unitário de venda inválido.");
    if (quantity === null || quantity <= 0)
      rowError("Unidades deve ser um inteiro positivo.");

    if (
      !saleId ||
      !status ||
      !orderedAt ||
      totalAmount === null ||
      !title ||
      unitPrice === null ||
      quantity === null ||
      quantity <= 0
    ) {
      continue;
    }

    const productRevenueAmount =
      parseMoney(record.productRevenue) ?? totalAmount;
    const discountFilled = hasCellValue(record.discount);
    const shippingFilled = hasCellValue(record.shipping);
    const revenueShippingFilled = hasCellValue(record.revenueShipping);
    const discountAmount = Math.abs(parseMoney(record.discount) ?? 0);
    const shippingTariff = Math.abs(parseMoney(record.shipping) ?? 0);
    const revenueShipping = Math.abs(parseMoney(record.revenueShipping) ?? 0);
    const shippingAmount =
      shippingFilled || revenueShippingFilled
        ? shippingTariff - revenueShipping
        : null;
    const flex = discountFilled && !shippingFilled && !revenueShippingFilled;
    const sku = hasCellValue(record.sku) ? String(record.sku).trim() : null;
    const item: ParsedItem = {
      externalProductId: externalProductId(sku, title),
      quantity,
      sku,
      title,
      unitPrice,
    };
    const existing = orders.get(saleId);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    orders.set(saleId, {
      commissionAmount: Math.abs(parseMoney(record.commission) ?? 0),
      discountAmount,
      flex,
      items: [item],
      orderedAt,
      productRevenueAmount,
      saleId,
      shippingAmount,
      sourceRow,
      status,
      totalAmount,
    });
  }

  return { errors, orders: Array.from(orders.values()), totalRows };
}

export function parseMercadoLivreSpreadsheet(buffer: Buffer) {
  return parseRows(buffer);
}

@Injectable()
export class OrderSpreadsheetImportService {
  private readonly logger = new Logger(OrderSpreadsheetImportService.name);
  private readonly mercadoLivreProvider: MercadoLivreProvider;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: DatabaseClient,
    @Inject(API_RUNTIME_ENV) env: ApiRuntimeEnv,
  ) {
    this.mercadoLivreProvider = new MercadoLivreProvider(env);
  }

  async importMercadoLivreOrders(input: {
    buffer: Buffer;
    companyId: string;
    organizationId: string;
  }): Promise<OrderSpreadsheetImportResult> {
    const parsed = parseRows(input.buffer);
    const connection = await this.findConnection(input);
    const preparedConnection = await this.prepareConnection(connection);
    const flexConnection = preparedConnection.connection;
    const errors = [...parsed.errors];
    let pendingFlex = 0;
    let created = 0;
    let updated = 0;

    for (const order of parsed.orders) {
      let fixedCost: number | null = null;
      let mercadoLivreOrderIds: string[] = [];
      let flexResolution: "resolved" | "pending" = "resolved";

      if (order.flex) {
        if (!flexConnection?.accessToken) {
          flexResolution = "pending";
          errors.push({
            message: this.getConnectionIssueMessage(
              preparedConnection.issue ?? "missing",
            ),
            row: order.sourceRow,
            saleId: order.saleId,
          });
        } else {
          try {
            const fixedCostResolution =
              await this.mercadoLivreProvider.resolveSpreadsheetFixedCostForSale(
                {
                  accessToken: flexConnection.accessToken,
                  saleId: order.saleId,
                },
              );
            fixedCost = fixedCostResolution.fixedCost;
            mercadoLivreOrderIds = fixedCostResolution.orderIds;
            if (mercadoLivreOrderIds.length === 0) {
              flexResolution = "pending";
              errors.push({
                message:
                  "Não foi possível localizar o pedido correspondente à venda na API do Mercado Livre.",
                row: order.sourceRow,
                saleId: order.saleId,
              });
            } else if (fixedCost === null) {
              flexResolution = "pending";
              errors.push({
                message: "Custo Fixo não encontrado na API do Mercado Livre.",
                row: order.sourceRow,
                saleId: order.saleId,
              });
            }
          } catch (error) {
            flexResolution = "pending";
            this.logger.warn(
              `Could not resolve Mercado Livre fixed cost for sale ${order.saleId} (organization ${input.organizationId}, company ${input.companyId}, connection ${flexConnection.id}): ${String(error)}`,
            );
            errors.push({
              message:
                "Não foi possível consultar o Custo Fixo na API do Mercado Livre.",
              row: order.sourceRow,
              saleId: order.saleId,
            });
          }
        }

        if (flexResolution === "pending") {
          pendingFlex += 1;
        }
      }

      const result = await this.persistOrder({
        companyId: input.companyId,
        connection: flexConnection,
        fixedCost,
        flexResolution,
        mercadoLivreOrderIds,
        order,
        organizationId: input.organizationId,
      });
      if (result === "created") created += 1;
      else updated += 1;
    }

    return {
      created,
      errors,
      imported: created + updated,
      pendingFlex,
      provider: "mercadolivre",
      totalRows: parsed.totalRows,
      updated,
      validRows: parsed.orders.length,
    };
  }

  private async findConnection(input: {
    companyId: string;
    organizationId: string;
  }): Promise<MarketplaceConnection | null> {
    return (
      (await this.db.query.marketplaceConnections.findFirst({
        where: (table) =>
          and(
            eq(table.organizationId, input.organizationId),
            eq(table.companyId, input.companyId),
            eq(table.provider, "mercadolivre"),
          ),
      })) ?? null
    );
  }

  private async prepareConnection(
    connection: MarketplaceConnection | null,
  ): Promise<PreparedMarketplaceConnection> {
    if (!connection) {
      return { connection: null, issue: "missing" };
    }

    if (connection.status !== "connected") {
      return { connection: null, issue: "disconnected" };
    }

    if (!connection.accessToken) {
      return { connection: null, issue: "missing_token" };
    }

    const expiresAt = connection.tokenExpiresAt
      ? new Date(connection.tokenExpiresAt).getTime()
      : null;
    if (!expiresAt || expiresAt > Date.now()) {
      return { connection, issue: null };
    }

    try {
      const refreshed =
        await this.mercadoLivreProvider.refreshAccessToken(connection);
      await this.db
        .update(marketplaceConnections)
        .set({
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          tokenExpiresAt: refreshed.tokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(marketplaceConnections.id, connection.id));
      return { connection: { ...connection, ...refreshed }, issue: null };
    } catch (error) {
      this.logger.warn(
        `Could not refresh Mercado Livre connection ${connection.id} for organization ${connection.organizationId} and company ${connection.companyId}: ${String(error)}`,
      );
      return { connection: null, issue: "refresh_failed" };
    }
  }

  private getConnectionIssueMessage(issue: MarketplaceConnectionIssue) {
    switch (issue) {
      case "disconnected":
        return "Custo Fixo pendente: a conexão do Mercado Livre está desconectada.";
      case "missing_token":
        return "Custo Fixo pendente: a conexão do Mercado Livre não possui token.";
      case "refresh_failed":
        return "Custo Fixo pendente: o token do Mercado Livre expirou e não pôde ser renovado.";
      case "missing":
      default:
        return "Custo Fixo pendente: Mercado Livre não está conectado para a empresa selecionada.";
    }
  }

  private async persistOrder(input: {
    companyId: string;
    connection: MarketplaceConnection | null;
    fixedCost: number | null;
    flexResolution: "resolved" | "pending";
    mercadoLivreOrderIds?: string[];
    order: ParsedOrder;
    organizationId: string;
  }): Promise<"created" | "updated"> {
    return this.db.transaction(async (tx) => {
      const existing = await tx.query.externalOrders.findFirst({
        columns: { id: true, metadata: true },
        where: (table) =>
          and(
            eq(table.organizationId, input.organizationId),
            eq(table.companyId, input.companyId),
            eq(table.provider, "mercadolivre"),
            eq(table.externalOrderId, input.order.saleId),
          ),
      });
      const pendingFinancialFields =
        input.order.flex && input.flexResolution === "pending"
          ? ["shippingOrFixedFeeAmount", "taxAmount"]
          : [];
      const metadata: Record<string, unknown> = {
        importSource: "spreadsheet",
        source: "spreadsheet",
        sourceStatus: input.order.status,
        spreadsheetImport: true,
        tags: input.order.flex ? ["ENVIO FLEX"] : [],
        pendingFinancialFields,
        ...(input.mercadoLivreOrderIds && input.mercadoLivreOrderIds.length > 0
          ? { mercadoLivreOrderIds: input.mercadoLivreOrderIds }
          : {}),
        flexResolution: input.order.flex
          ? {
              fixedCostAmount: input.fixedCost?.toFixed(2) ?? null,
              status: input.flexResolution,
              source: "mercadolivre_api",
            }
          : null,
        ...(input.fixedCost !== null
          ? {
              compositionOverrides: {
                marketplaceCommissionAmount: (
                  input.order.commissionAmount - input.fixedCost
                ).toFixed(2),
              },
              fixedCostAmount: input.fixedCost.toFixed(2),
            }
          : {}),
        spreadsheetProductRevenueAmount:
          input.order.productRevenueAmount.toFixed(2),
        ...(input.order.packageInfo
          ? {
              package: {
                childSaleIds: input.order.packageInfo.childSaleIds,
                declaredItemCount: input.order.packageInfo.declaredItemCount,
                kind: "mercadolivre_package",
                parentSaleId: input.order.saleId,
              },
            }
          : {}),
      };
      const [storedOrder] = await tx
        .insert(externalOrders)
        .values({
          companyId: input.companyId,
          currency: "BRL",
          marketplaceConnectionId: input.connection?.id ?? null,
          metadata,
          organizationId: input.organizationId,
          orderedAt: input.order.orderedAt,
          provider: "mercadolivre",
          refundBonusAmount: input.order.discountAmount.toFixed(2),
          refundBonusCents: Math.round(input.order.discountAmount * 100),
          refundBonusAttempts: 0,
          refundBonusLastCheckedAt: new Date(),
          refundBonusMetadata: { source: "spreadsheet" },
          refundBonusResolvedAt: new Date(),
          refundBonusSource: "spreadsheet",
          refundBonusStatus:
            input.order.discountAmount > 0 ? "RESOLVED" : "RESOLVED_ZERO",
          status: normalizeImportedStatus(input.order.status),
          syncRunId: null,
          totalAmount: input.order.totalAmount.toFixed(2),
          externalOrderId: input.order.saleId,
        })
        .onConflictDoUpdate({
          set: {
            currency: "BRL",
            marketplaceConnectionId: input.connection?.id ?? null,
            metadata,
            orderedAt: input.order.orderedAt,
            refundBonusAmount: input.order.discountAmount.toFixed(2),
            refundBonusCents: Math.round(input.order.discountAmount * 100),
            refundBonusAttempts: 0,
            refundBonusLastCheckedAt: new Date(),
            refundBonusMetadata: { source: "spreadsheet" },
            refundBonusResolvedAt: new Date(),
            refundBonusSource: "spreadsheet",
            refundBonusStatus:
              input.order.discountAmount > 0 ? "RESOLVED" : "RESOLVED_ZERO",
            status: normalizeImportedStatus(input.order.status),
            syncRunId: null,
            totalAmount: input.order.totalAmount.toFixed(2),
            updatedAt: new Date(),
          },
          target: [
            externalOrders.organizationId,
            externalOrders.companyId,
            externalOrders.provider,
            externalOrders.externalOrderId,
          ],
        })
        .returning({ id: externalOrders.id });

      await tx
        .delete(externalOrderItems)
        .where(
          and(
            eq(externalOrderItems.organizationId, input.organizationId),
            eq(externalOrderItems.externalOrderId, storedOrder.id),
          ),
        );
      await tx
        .delete(externalFees)
        .where(
          and(
            eq(externalFees.organizationId, input.organizationId),
            eq(externalFees.externalOrderId, storedOrder.id),
          ),
        );

      for (const item of input.order.items) {
        const [product] = await tx
          .insert(externalProducts)
          .values({
            companyId: input.companyId,
            externalProductId: item.externalProductId,
            marketplaceConnectionId: input.connection?.id ?? null,
            metadata: {
              importSource: "spreadsheet",
              source: "spreadsheet",
            },
            organizationId: input.organizationId,
            provider: "mercadolivre",
            sku: item.sku,
            title: item.title,
          })
          .onConflictDoUpdate({
            set: {
              marketplaceConnectionId: input.connection?.id ?? null,
              sku: item.sku,
              title: item.title,
              metadata: {
                importSource: "spreadsheet",
                source: "spreadsheet",
              },
              updatedAt: new Date(),
            },
            target: [
              externalProducts.organizationId,
              externalProducts.companyId,
              externalProducts.provider,
              externalProducts.externalProductId,
            ],
          })
          .returning({ id: externalProducts.id });

        await tx.insert(externalOrderItems).values({
          externalProductId: product.id,
          externalOrderId: storedOrder.id,
          organizationId: input.organizationId,
          quantity: item.quantity,
          totalPrice: (item.unitPrice * item.quantity).toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
        });
      }

      const fees = [
        {
          amount: input.order.commissionAmount.toFixed(2),
          feeType: "marketplace_commission",
          metadata: { source: "spreadsheet" },
        },
        ...(input.order.discountAmount > 0
          ? [
              {
                amount: input.order.discountAmount.toFixed(2),
                feeType: "refund_bonus",
                metadata: { source: "spreadsheet" },
              },
            ]
          : []),
        ...(input.fixedCost !== null
          ? [
              {
                amount: input.fixedCost.toFixed(2),
                feeType: "fixed_fee",
                metadata: { source: "mercadolivre_api" },
              },
            ]
          : input.order.shippingAmount !== null && !input.order.flex
            ? [
                {
                  amount: input.order.shippingAmount.toFixed(2),
                  feeType: "shipping_cost",
                  metadata: { source: "spreadsheet" },
                },
              ]
            : []),
      ];
      if (fees.length > 0) {
        await tx.insert(externalFees).values(
          fees.map((fee) => ({
            amount: fee.amount,
            currency: "BRL",
            externalOrderId: storedOrder.id,
            feeType: fee.feeType,
            metadata: fee.metadata,
            organizationId: input.organizationId,
            provider: "mercadolivre",
          })),
        );
      }

      return existing ? "updated" : "created";
    });
  }
}
