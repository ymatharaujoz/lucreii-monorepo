# Mercado Livre spreadsheet fixed-cost resolution

## Context

The Mercado Livre spreadsheet importer currently sends the spreadsheet `N.º de venda` directly as `order_ids` to the billing order-details endpoint. Mercado Livre exports can provide a sale/pack identifier that is not the order identifier expected by that endpoint. This leaves Flex rows with a pending fixed cost even when the account is connected.

Official API references:

- [`GET /packs/{PACK_ID}`](https://developers.mercadolivre.com.br/pt_br/produto-consulta-de-usuarios/gestao-packs) returns the orders associated with a pack in `orders[].id`.
- [`GET /orders/{ORDER_ID}`](https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-vendas) retrieves an order by its canonical order ID.
- [`GET /billing/integration/group/ML/order/details`](https://developers.mercadolivre.com.br/pt_br/provisoes) accepts `order_ids` and exposes the Brazilian `sale_fee.fixed_fee`.

## Design

### Provider boundary

Extend `MercadoLivreProvider` with one spreadsheet-specific resolver. Given an access token and spreadsheet sale ID, it will:

1. Request `GET /packs/{saleId}`.
2. Read unique seller-visible order IDs from `orders[].id`.
3. If the pack is not found or has no usable orders, request `GET /orders/{saleId}` as a compatibility fallback for exports where the sale ID is already an order ID.
4. Cache the sale-to-order resolution by access token and sale ID for the lifetime of the provider instance.
5. Resolve the fixed fee for each returned order through the existing billing-detail parser and return the sum plus the resolved order IDs.

The provider will not expose raw remote payloads to the importer. Existing retry, authorization headers, response parsing, and billing caches remain the single implementation path for remote calls.

### Import flow

For Flex rows with a connected Mercado Livre access token, the importer will call the new provider resolver instead of passing `order.saleId` directly to billing. For a pack with multiple orders, all fixed fees are summed. If any order cannot be resolved or has no fixed fee, the sale remains pending and no partial fixed-fee record is persisted.

The spreadsheet sale ID remains `externalOrderId` and continues to define import idempotency and display. Persist metadata will additionally include the canonical Mercado Livre order IDs used for billing, preserving traceability without changing existing imported order identities.

Disconnected accounts, non-Flex rows, shipping fee behavior, and existing package parsing remain unchanged.

### Errors and observability

Unresolved mappings remain best-effort: the order is persisted, `pendingFlex` increments once, and the import response includes a row-level error. Remote failures are logged with the spreadsheet sale ID; tokens and payloads are never logged.

### Tests

Add provider tests covering:

- pack lookup returning one order and fixed fee resolution using that order ID;
- pack lookup returning multiple orders and summed fixed fees;
- pack lookup miss followed by direct order fallback;
- unresolved mapping preserving pending behavior.

Add importer tests asserting the provider receives the canonical order IDs, stores them in metadata, and does not persist a partial fee when one order in a pack is unresolved. Existing spreadsheet parsing and import regression tests must remain green.
