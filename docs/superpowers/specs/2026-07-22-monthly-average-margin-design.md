# Margem Média mensal baseada nos detalhes dos pedidos

## Contexto

O card `Margem Média` do `/app` não deve usar a receita agregada atual do dashboard nem a rentabilidade média por produto. O valor precisa reproduzir os dados exibidos nos modais de detalhes de `/app/orders`, agregados para todos os pedidos do mês selecionado e, quando aplicável, do marketplace selecionado.

## Regra de negócio

Para o conjunto de pedidos filtrado pelo mês:

- `Vendas Líquidas Total` é a soma de `items.quantity` de todos os itens exibidos na aba `Itens`.
- `Custo do Produto Total (PDV)` é a soma de `items.unitPrice`, o campo exibido como `Preço de Venda`, de todos os itens.
- `Receita` é literalmente `Vendas Líquidas Total × Custo do Produto Total (PDV)`.
- `Comissão Meli Total` é a soma de `composition.marketplaceCommissionAmount`.
- `Taxa/Frete Total` é a soma de `composition.shippingOrFixedFeeAmount`.
- `Imposto Total` é a soma de `composition.taxAmount`.
- `Embalagem Total` é a soma de `financeDefaults.packagingCost` do catálogo para cada produto distinto vinculado a pelo menos um item vendido no mês. O valor do catálogo entra uma vez por produto, não uma vez por pedido ou unidade.
- `Custo do Produto Total` é o mesmo total de `Preço de Venda` definido acima.
- `Lucro Total` é `Receita − Comissão Meli Total − Taxa/Frete Total − Imposto Total − Embalagem Total − Custo do Produto Total`.
- `Margem Média` é `Receita / Lucro Total`, arredondada normalmente para duas casas.

Publicidade, custo fixo e bônus/estorno não entram no novo `Lucro Total`. A razão convencional de lucro sobre receita continua disponível apenas para break-even e estado visual.

## Arquitetura e fluxo de dados

O backend continuará usando o mesmo agrupamento de pedidos do endpoint `/orders`, incluindo agrupamentos do Mercado Livre. O rollup mensal será calculado em `buildOrdersSummary` sobre `LogicalOrder`:

- `logicalOrder.items` fornece `quantity` e `unitPrice` exatamente como a aba `Itens`.
- `logicalOrder.composition` fornece comissão, frete/taxa e imposto exatamente como a aba `Composição`.
- `logicalOrder.rows` fornece os produtos vinculados e seus valores de embalagem do catálogo.

O contrato de `OrdersListSummary` será estendido com `marginRevenue`. `totalProfit` passará a representar o lucro da regra acima; `grossRevenue`, `grossProfit` e `averageMargin` permanecerão preservados para consumidores legados.

O dashboard usará `ordersSummary.marginRevenue` como faturamento da margem e como numerador da razão invertida. A consulta do resumo mensal será considerada parte do carregamento/erro do dashboard para evitar renderizar uma margem aproximada enquanto o resumo correto ainda não chegou.

## Precisão e casos-limite

- Valores monetários serão acumulados em centavos ou equivalente determinístico antes da formatação.
- Receita zero ou lucro zero renderiza `0,0%`.
- Lucro negativo preserva o sinal na razão `Receita / Lucro Total`.
- Pedidos agrupados não serão contados duas vezes.
- Produtos repetidos em vários pedidos terão a embalagem somada uma única vez por produto vinculado.
- Produto sem vínculo de catálogo não acrescenta embalagem; os demais valores disponíveis são preservados conforme a política atual.

## Testes

- Testar o rollup backend com vários pedidos e itens, verificando soma de quantidade, soma de preço de venda, composições, embalagem distinta e resultado final.
- Testar pedidos agrupados do Mercado Livre sem duplicação.
- Testar lucro zero, lucro negativo e ausência de produtos vinculados.
- Atualizar o contrato Zod, fixtures de API e testes do resumo.
- Testar o card com `894,48 / 202,51 = 4,42%`, além de zero e negativo.
- Rodar testes direcionados de API/validação/web e o typecheck completo.

## Fora de escopo

- Migração de banco.
- Alteração dos valores exibidos nos modais de pedidos ou na tabela do catálogo.
- Recalcular métricas legadas de rentabilidade por produto, publicidade ou custo fixo.
