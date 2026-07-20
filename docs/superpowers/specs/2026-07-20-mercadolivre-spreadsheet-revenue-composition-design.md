# Mercado Livre spreadsheet revenue and composition values

## Scope

Change only Mercado Livre orders imported from spreadsheets. Keep API-synchronized orders and all unrelated imported fields unchanged.

## Data flow

The spreadsheet parser reads `Receita por produtos (BRL)` as an optional product-revenue value, falling back to the existing total only for backward compatibility with older files. The import service persists the parsed value in order metadata as `spreadsheetProductRevenueAmount`.

When the fixed cost resolver succeeds, the import service also persists `compositionOverrides.marketplaceCommissionAmount` as:

`Tarifa de venda e impostos (BRL) - Custo Fixo`

The existing raw `totalAmount` and marketplace fee rows remain unchanged. This keeps the source values available while allowing the orders read model to expose the requested presentation values.

## Orders read model

For spreadsheet-imported Mercado Livre orders only:

- `OrderListItem.totalWithFees`, displayed as `Faturamento` in `/app/orders`, reads `spreadsheetProductRevenueAmount`.
- `OrderComposition.revenueAmount`, displayed as `Faturamento` in the details modal, reads the same metadata value.
- `OrderComposition.marketplaceCommissionAmount`, displayed as `Comissão`, reads the persisted composition override when fixed cost was resolved.

Orders without the metadata, orders from other providers, and Mercado Livre orders synchronized through the API retain the current behavior.

## Validation

Add parser/import persistence coverage and orders-service coverage. The supplied workbook provides the acceptance fixtures:

- Spreadsheet row 343: product revenue `38.00`, tariff `11.02`, fixed cost `6.65`, commission `4.37`.
- Spreadsheet row 386: product revenue `39.90`, tariff `11.24`, fixed cost `6.65`, commission `4.59`.

Existing fixed-cost, connection, and unrelated order tests must remain passing.
