# Separação de Layout entre Dashboard e Marketplaces

## Objetivo

Tornar `/app` uma visão financeira consolidada, sem seletor de canal, e reduzir elementos laterais de `/app/marketplaces` para ampliar a Evolução Financeira.

## Comportamento esperado

- `/app` não exibe os controles Todos, Mercado Livre, Shopee ou Shein e sempre consulta dados consolidados de todos os canais.
- `/app/marketplaces` mantém seletor de canal, ranking em modal e tabela de pedidos.
- Em `/app/marketplaces`, quando a visão é consolidada, não exibir a linha de edição Custo Fixo/Imposto.
- Em `/app/marketplaces`, a edição de Publicidade continua disponível somente ao selecionar um canal específico.
- Em `/app/marketplaces`, remover integralmente o painel Marketplaces / Integrações ativas.
- Sem painel lateral, Evolução Financeira ocupa toda a largura disponível em `/app/marketplaces`.
- `/app` preserva a linha de edição Custo Fixo/Imposto e o painel de integrações atual.

## Arquitetura

- `DashboardHome` recebe flags explícitas para exibir seletor de canal, edição consolidada e painel de integrações.
- Valores padrão representam o Dashboard consolidado: canal oculto, edição consolidada e integrações visíveis.
- A rota Marketplaces habilita seletor de canal e desabilita edição consolidada e painel de integrações.
- `DashboardFinancialIndicators` recebe flag para ocultar somente a edição consolidada; regras e edição de publicidade específicas permanecem inalteradas.
- A seção de gráficos alterna entre grade com painel lateral e renderização de largura total, sem duplicar `ChartsSection`.

## Critérios de aceite

- `/app` não contém botões de filtro de canal e todas as consultas usam `provider: null`.
- `/app/marketplaces` mantém filtros de canal e repassa canal/mês para ranking e pedidos.
- `/app/marketplaces` não contém Custo Fixo, Imposto ou ação de editar esses padrões quando canal é Todos.
- Ao selecionar um canal em Marketplaces, edição de Publicidade permanece disponível.
- `/app/marketplaces` não renderiza Marketplaces, Integrações ativas nem Gerenciar no painel de gráficos.
- Evolução Financeira ocupa largura total em Marketplaces.
- Dashboard padrão preserva integrações e edição de Custo Fixo/Imposto.

## Fora de escopo

- Mudar APIs, dados, cálculos financeiros, permissões, sincronização, Ranking de Produtos ou Pedidos.
