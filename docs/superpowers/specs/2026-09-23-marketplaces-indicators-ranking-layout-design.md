# Ajustes de Indicadores e Ranking em Marketplaces

## Objetivo

Melhorar a leitura dos indicadores financeiros de `/app/marketplaces` e tornar o modal `Ranking de Produtos` estável em desktop e mobile.

## Indicadores

- A ordem dos seis cards em Marketplaces será: Faturamento, Devoluções, Margem Líquida, Custo & Imposto, Tarifa de Venda e Frete Total.
- `Custo & Imposto` mantém o total `productCost + packagingCost + taxAmount`.
- O detalhe do card exibirá duas linhas independentes: `Custo: ...` e `Imposto: ...`.
- Custo continuará sendo `productCost + packagingCost`; frete continuará exclusivamente no card `Frete Total`.
- Valores, fórmulas e variante de indicadores existentes em `/app` não mudam.

## Modal de Ranking

- O modal terá largura total dentro das margens da viewport, com máximo `max-w-6xl`, e altura responsiva limitada a aproximadamente 78% da viewport ou 704px.
- Título do modal e controles do ranking permanecem visíveis.
- Somente área da tabela terá viewport próprio, com rolagem vertical e horizontal.
- A tabela continuará usando sua largura mínima atual, permitindo rolagem lateral em telas estreitas sem alargar ou ultrapassar o modal.
- Cabeçalho da tabela permanece visível enquanto linhas são roladas.
- Modal continua fechando por botão, overlay e `Escape`.

## Arquitetura

- `DashboardFinancialIndicators` reorganizará exclusivamente a variante `marketplace` e aceitará conteúdo de detalhe em múltiplas linhas.
- `Modal` receberá classe opcional para seu conteúdo interno, permitindo uma área flexível com altura controlada sem mudar consumidores existentes.
- `ProductsTable` receberá classes opcionais e específicas para o container e viewport da tabela; seu uso fora do modal não muda.
- `ProductRankingModal` combinará essas extensões para definir tamanho do modal e scroll localizado.
- Não haverá alterações em API, banco, consultas, dados, permissões, cálculos ou ordenação do ranking.

## Critérios de Aceite

- Card `Custo & Imposto` mostra Custo e Imposto em linhas separadas.
- Cards de Marketplaces seguem exatamente a ordem definida.
- Modal de ranking não ultrapassa largura ou altura visível em desktop ou mobile.
- Ranking permite scroll vertical das linhas e horizontal da tabela quando necessário, sem deslocar título e controles.
- Funcionalidades atuais do ranking, filtros globais, estado vazio e fechamento do modal permanecem operacionais.
- Testes cobrem ordem/detalhes dos cards e classes/integração da área rolável do ranking.

## Fora de Escopo

- Redesenhar dados do ranking, criar visualização em cards mobile, alterar campos financeiros ou modificar comportamento de outras rotas.
