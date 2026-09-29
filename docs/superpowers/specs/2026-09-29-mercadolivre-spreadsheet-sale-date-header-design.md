# Mercado Livre spreadsheet sale date header

## Objective

Allow the Mercado Livre order spreadsheet importer to recognize the sale-date
column in the attached export format.

## Current and expected behavior

The importer recognizes `Data da venda`, but the supplied Mercado Livre export
labels the same field `Data de venda`. Header discovery therefore fails with
HTTP 400 before reading any sales. Both labels must identify the date column.

## Scope and behavior

- Add `DATA DE VENDA` as an alias for the existing date header.
- Keep the current row validation and partial-import behavior. Incomplete rows
  continue to produce row-level errors; valid rows remain importable.
- Leave API contracts, persistence, other providers, and other column mappings
  unchanged.

## Acceptance criteria

- A workbook using `Data de venda` is recognized and its sales parse.
- Existing `Data da venda` workbooks continue to parse.
- Incomplete data rows retain current row-level error behavior.

## Implementation and validation plan

- Extend the date header aliases in
  `apps/api/src/modules/integrations/order-spreadsheet-import.service.ts`.
- Add parser regression coverage for the `Data de venda` spelling in
  `apps/api/src/modules/integrations/order-spreadsheet-import.service.test.ts`.
- Run the focused API test and typecheck, then review the final diff.
