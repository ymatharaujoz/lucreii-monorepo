# Filtro de Mês e Intervalo do Dashboard

## Objetivo

Substituir o filtro exclusivamente mensal de `/app` e `/app/marketplaces` por um seletor de mês acompanhado de um intervalo de datas dentro desse mês. O intervalo deve definir todos os dados exibidos na rota.

## Regras de Seleção

- O usuário escolhe um mês de referência e datas inicial/final inclusivas pertencentes ao mês selecionado.
- Datas futuras não são selecionáveis. No mês atual, a data máxima é hoje em `America/Sao_Paulo`; em meses passados, é o último dia do mês.
- A data inicial não pode ser posterior à final.
- Em `/app`, o padrão é primeiro dia do mês atual até hoje. Ao escolher um mês passado, o padrão é o mês completo.
- Em `/app/marketplaces`, o padrão é hoje até hoje. Ao escolher um mês passado, o padrão é o mês completo.
- Ao mudar o mês, o intervalo é redefinido pela regra da rota. Uma alteração manual do intervalo permanece somente até nova troca de mês.
- O mês de referência já persistido por empresa continua como está. O intervalo é estado local de Dashboard/Marketplaces e não altera a página de Produtos.

## Aplicação do Filtro

- Um mesmo `referenceMonth`, `dateFrom` e `dateTo` será enviado para summary, indicadores financeiros, gráficos, rentabilidade/ranking e pedidos/exportação.
- O Dashboard e Marketplaces não podem misturar dados mensais com dados de intervalo selecionado.
- Intervalo parcial usa valores proporcionais de Custo Fixo e Publicidade: valor mensal vezes número de dias inclusivos selecionados dividido pelo número de dias do mês.
- A Margem Líquida usa esses valores rateados.
- Edição de Custo Fixo e Publicidade continua alterando o valor de origem mensal. Quando o intervalo não for o mês completo, a interface identifica explicitamente o valor editável como mensal.

## Interface

- A barra de filtros preserva o dropdown `Mês de Referência` e adiciona campos nativos `Data inicial` e `Data final`.
- Os campos terão limites mínimo/máximo derivados do mês e da data atual, impedindo seleção fora do período permitido.
- Os defaults diferentes serão configurados por rota na instância de `DashboardHome`, sem efeito no Dashboard consolidado, produtos ou outras páginas.

## API e Serviços

- Endpoints de dashboard aceitarão `dateFrom` e `dateTo` como par opcional em formato `YYYY-MM-DD`.
- Validação no servidor exige ambas as datas quando uma estiver presente, ordem válida, datas dentro de `referenceMonth` e ausência de datas futuras.
- Chamadas sem o par de datas preservam o fallback de mês completo para compatibilidade.
- `FinanceService` receberá intervalo explícito e aplicará o filtro nas ordens, publicidade e despesas usadas por summary, gráfico e ranking.
- `OrdersService.readExportedFinancialSummary` receberá o intervalo explícito para que indicadores financeiros totalizem exatamente os mesmos pedidos.
- `FinancialIndicatorsService` aplicará o fator de rateio aos custos mensais e fornecerá valor mensal de publicidade necessário para edição sem sobrescrever o valor rateado.

## Critérios de Aceite

- `/app` abre em primeiro dia do mês atual até hoje; `/app/marketplaces` abre apenas no dia atual.
- Meses passados iniciam com mês completo em ambas as rotas.
- Usuário consegue escolher intervalo válido dentro do mês, sem dias futuros.
- Indicadores, gráfico, ranking, pedidos e exportação respondem ao mesmo intervalo.
- Custo Fixo, Publicidade e Margem Líquida usam rateio correto em intervalo parcial; edição preserva valor mensal.
- API recusa datas incompletas, invertidas, fora do mês ou futuras.
- Testes cobrem defaults, limites, troca de mês, propagação de consultas, rateio e validação do servidor.

## Fora de Escopo

- Intervalos entre meses diferentes, presets adicionais, persistência do intervalo, mudanças em sincronização, banco de dados ou regras de cálculo que não sejam o rateio definido.
