# Seletor único de período no Dashboard

## Objetivo

Substituir os controles visíveis de mês de referência, data inicial e data final em `/app` e `/app/marketplaces` por um único seletor de período compacto.

## Experiência

- O controle fechado exibe o período confirmado em formato curto: `15 set. — 23 set. 2026`.
- Ao clicar, abre um popover ancorado no controle. O popover contém:
  - seletor de mês de referência;
  - calendário limitado ao mês selecionado;
  - campos de início e fim para leitura e ajuste preciso;
  - ações `Cancelar` e `Aplicar`.
- Mudar o mês redefine o rascunho do período ao padrão da rota:
  - `/app`: primeiro dia do mês até hoje para o mês atual; mês inteiro para meses anteriores;
  - `/app/marketplaces`: hoje até hoje no mês atual; mês inteiro para meses anteriores.
- `Aplicar` atualiza o dashboard. `Cancelar`, clique fora e `Escape` descartam mudanças ainda não aplicadas.
- Dias fora do mês escolhido e posteriores à data atual em São Paulo ficam indisponíveis. O início nunca pode superar o fim.

## Dados e compatibilidade

- O período confirmado continua sendo enviado como `referenceMonth`, `dateFrom` e `dateTo` para resumo, gráficos, ranking, indicadores, pedidos e exportação.
- Nenhuma regra de rateio, endpoint, contrato, banco de dados ou default de dados muda.
- Custos fixos e publicidade continuam rateados para o intervalo confirmado; seus editores continuam operando no valor mensal.

## Implementação

- Evoluir `DateRangePicker` para aceitar a seleção de mês de referência, limites mensais e um rascunho local antes da confirmação.
- Trocar o toolbar atual de três controles por esse componente no `DashboardHome`.
- Manter o estado confirmado no `DashboardHome`; o seletor administra apenas estado temporário enquanto está aberto.
- Cobrir renderização do rótulo, redefinição ao mudar o mês, aplicar/cancelar, limites e propagação do período confirmado.

## Fora de escopo

- Alterar filtros de Produtos ou de outras páginas.
- Criar novos presets genéricos de período.
- Alterar cálculos financeiros ou persistir o intervalo escolhido.
