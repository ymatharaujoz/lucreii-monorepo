# Dashboard e Marketplaces

## Objetivo

Separar visão financeira resumida da listagem operacional de pedidos, sem alterar integrações, dados ou permissões existentes.

## Comportamento atual

- Item principal do menu chama-se `Painel` e aponta para `/app`.
- `/app` renderiza `DashboardHome`, incluindo `OrdersHome` ao final.
- Não existe rota `/app/marketplaces`.
- `/app/integrations` existe e permanece inalterada.

## Comportamento esperado

- Menu exibirá `Dashboard` no lugar de `Painel`, com ícone de velocímetro analítico no lugar do ícone de grade.
- Menu incluirá `Marketplaces`, apontando para `/app/marketplaces`.
- `/app` continuará sendo Dashboard, mas não exibirá tabela nem controles de `Pedidos`.
- `/app/marketplaces` exibirá mesma composição, dados, filtros de período e filtros de provedor do Dashboard atual, incluindo `OrdersHome` ao final.
- Filtro de provedor e mês selecionados em Marketplaces serão recebidos pela tabela de pedidos, preservando comportamento atual.
- Rota Marketplaces seguirá mesmas regras de autenticação, assinatura, empresa ativa e seleção automática de empresa usadas por `/app`.
- Integrações continuará acessível em `/app/integrations`, sem mudança de nome, rota ou conteúdo.

## Arquitetura

- `DashboardHome` receberá opção explícita para exibir pedidos. Valor padrão será falso, mantendo `/app` livre da tabela.
- Página `/app/marketplaces` reutilizará `DashboardHome` com essa opção ativa.
- Dados, componentes financeiros e estado de filtros serão compartilhados; não haverá cópia do componente Dashboard nem novas chamadas de API, tabelas, schemas ou permissões.
- Navegação lateral definirá novo rótulo, ícone e entrada Marketplaces conforme estilos atuais.

## Casos de falha e compatibilidade

- Falhas de carregamento, estados vazios, controles de sincronização e redirecionamentos existentes permanecem responsabilidade dos componentes e guardas atuais.
- A nova rota não cria nem modifica dados.
- URLs existentes, especialmente `/app` e `/app/integrations`, permanecem válidas.

## Critérios de aceite

- Menu mostra `Dashboard` com novo ícone e link `/app`.
- Menu mostra `Marketplaces` com link `/app/marketplaces`.
- `/app` não renderiza `OrdersHome`.
- `/app/marketplaces` renderiza Dashboard e `OrdersHome` usando filtro de provedor e mês atuais.
- Integrações não muda.
- Testes cobrem nova opção do Dashboard, rota Marketplaces e navegação lateral.

## Fora de escopo

- Alterações de backend, banco, APIs, sincronização e modelo de pedidos.
- Redesenho de tabela, Dashboard ou página Integrações.
