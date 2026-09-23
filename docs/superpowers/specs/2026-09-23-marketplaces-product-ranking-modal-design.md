# Ranking de Produtos em Modal

## Objetivo

Liberar espaço vertical no Dashboard e em Marketplaces, mantendo o ranking de produtos acessível apenas em `/app/marketplaces` por meio de um botão que abre um modal responsivo.

## Comportamento atual

- `DashboardHome` renderiza `ProductsTable` sempre que a consulta de rentabilidade tem dados e o estado financeiro está pronto.
- Como `/app` e `/app/marketplaces` reutilizam `DashboardHome`, a tabela `TOP 10 Produtos` aparece nas duas rotas.
- A tabela ocupa toda a largura da página e contém modos Lucros/Vendas, ordenação por coluna, link para o catálogo e estado vazio.

## Comportamento esperado

- `/app` não renderiza tabela `TOP 10 Produtos`, botão de ranking ou modal de ranking.
- `/app/marketplaces` exibe botão secundário `Ranking de Produtos`, com ícone de troféu, na extremidade direita da barra de filtros de mês e canal.
- Em telas pequenas, o botão pode quebrar para uma linha própria sem se sobrepor aos filtros.
- Clique no botão abre modal com título `Ranking de Produtos`.
- Modal é largo no desktop, limitado à área visível e com rolagem interna; em telas pequenas, ocupa quase toda a viewport.
- Modal preserva ranking TOP 10, alternância Lucros/Vendas, ordenação por coluna, imagens, badges, link `Ver todos` e dados filtrados pelo mês e canal ativos.
- Botão permanece disponível quando não houver produtos qualificáveis. Nesse caso, modal mostra estado vazio e ação `Cadastrar produtos`.
- Fechamento por botão, clique no overlay ou `Escape` seguirá comportamento do componente `Modal` existente.

## Arquitetura

- `DashboardHome` receberá flag explícita para habilitar a experiência de ranking; valor padrão será falso.
- A rota `/app/marketplaces` habilitará a flag junto da experiência existente de pedidos. A rota `/app` permanecerá com o padrão.
- Um componente cliente de ranking concentrará estado aberto/fechado do modal e renderizará o gatilho na barra de filtros.
- `ProductsTable` será reutilizada como conteúdo do modal, com apresentação apropriada para evitar card aninhado e sem duplicar cálculos, ordenação ou estado vazio.
- A consulta de rentabilidade já usada pelo Dashboard continuará sendo fonte única; não haverá novas requisições, APIs, schemas ou permissões.

## Regras e casos de falha

- Filtros de mês e marketplace selecionados devem continuar atualizando ranking e pedidos em Marketplaces.
- Estados existentes de carregamento e erro do Dashboard permanecem inalterados.
- Estado financeiro insuficiente continua comunicando falta de dados na página; quando a consulta de rentabilidade estiver disponível sem linhas qualificáveis, o ranking expõe seu estado vazio no modal.
- Dados, autenticação, autorização, empresa ativa, redirecionamentos e integração de pedidos não mudam.

## Critérios de aceite

- `/app` não contém `TOP 10 Produtos` nem `Ranking de Produtos`.
- `/app/marketplaces` contém apenas gatilho de ranking fora do modal.
- Clique abre modal de ranking; `Escape`, overlay e controle de fechar o encerram.
- Ranking no modal mantém Lucros/Vendas, ordenação, TOP 10 e filtros globais atuais.
- Modal é navegável em desktop e mobile sem ultrapassar viewport; tabela tem rolagem horizontal quando necessária.
- Ausência de linhas qualificáveis preserva gatilho e apresenta ação para catálogo no modal.
- Testes cobrem flags de rota, gatilho, abertura/fechamento, filtros repassados e estado vazio.

## Fora de escopo

- Alterar métricas, cálculo/ranking, quantidade máxima de produtos, APIs, banco, permissões ou sincronização.
- Redesenhar pedidos, Dashboard, catálogo de produtos ou componente compartilhado `Modal`.
