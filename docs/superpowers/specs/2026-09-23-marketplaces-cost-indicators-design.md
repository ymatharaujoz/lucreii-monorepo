# Indicadores de Custos em Marketplaces

## Objetivo

Substituir a grade de indicadores em `/app/marketplaces` por métricas operacionais de custo, mantendo a margem líquida e preservando o Dashboard consolidado em `/app`.

## Comportamento esperado

- Em `/app/marketplaces`, com Todos ou qualquer canal selecionado, exibir: Faturamento, Devoluções, Custo & Imposto, Tarifa de Venda, Frete Total e Margem Líquida.
- Custo & Imposto exibe total `productCost + packagingCost + taxAmount`.
- Detalhes de Custo & Imposto exibem Custo `productCost + packagingCost` e Imposto `taxAmount`.
- Tarifa de Venda usa `marketplaceCommission`.
- Frete Total usa `shippingCost`.
- Margem Líquida mantém cálculo atual: lucro após custos, impostos, tarifa, frete e custo fixo, dividido pelo faturamento.
- `/app` preserva sua grade atual de indicadores financeiros.
- Edição de Publicidade em canal específico, ranking e pedidos não mudam.

## Arquitetura

- `DashboardFinancialIndicators` receberá variante explícita para o conjunto de cartões de Marketplaces.
- A rota `/app/marketplaces` habilitará essa variante; o Dashboard permanecerá no padrão existente.
- A variante reutilizará exclusivamente campos já presentes em `DashboardFinancialIndicators`; não haverá novos endpoints, chamadas, schemas ou cálculos de backend.
- O tratamento de valor zero, sinais e formatação monetária continuará usando os utilitários existentes.

## Critérios de aceite

- Marketplaces mostra exatamente os seis indicadores definidos, para Todos e canal específico.
- Custo & Imposto contém total, detalhe de Custo e detalhe de Imposto corretos.
- Tarifa de Venda e Frete Total refletem campos contratuais existentes.
- Margem Líquida preserva fórmula e sinal atuais.
- Dashboard não tem mudança na sua grade de indicadores.
- Testes cobrem variantes, somas, detalhes e filtros de canal.

## Fora de escopo

- Alterar API, banco, sincronização, rateios, fórmulas financeiras de origem, edição de Publicidade, ranking ou pedidos.
