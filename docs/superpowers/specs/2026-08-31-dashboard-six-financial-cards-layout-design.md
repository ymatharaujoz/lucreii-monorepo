# Seis cards financeiros em linha no dashboard

## Contexto

O dashboard `/app` passou a exibir um card separado para o faturamento inelegível, mas o conteúdo adicional aumenta a altura do primeiro card e quebra a composição visual quando os seis indicadores são exibidos em uma única grade.

## Objetivo

Exibir os seis indicadores financeiros lado a lado em telas desktop, com `Faturamento` e `Devoluções` como cards independentes, mantendo a leitura dos demais indicadores e evitando overflow ou clipping.

## Requisitos

- Exibir seis cards em uma única linha a partir do breakpoint desktop (`lg`): `Faturamento`, `Devoluções`, `Margem Média`, `Ponto de Equilíbrio`, `Lucro Líquido` e `Margem Líquida`.
- Manter o valor e a contagem de exclusões no card próprio vermelho, sem incorporá-los ao card de faturamento.
- Exibir no faturamento o contador `netSales` como `Vendas Líquidas`.
- Exibir no card vermelho o helper no formato `N Vendas Devolvidas, Cancelados ou Pendentes`.
- Usar dimensões, padding e tipografia compactos o suficiente para que os seis cards caibam no container existente sem quebra horizontal.
- Manter o valor monetário do card de devoluções em uma única linha, com dimensionamento responsivo.
- Preservar valores, tendências, variantes, animações, filtros e editor de custos existentes.
- Em larguras menores, degradar de forma previsível para três colunas, duas colunas e uma coluna.
- Não alterar API, contrato, regras financeiras, dependências ou dados.

## Abordagens consideradas

### A — seis colunas fluidas no desktop, aprovada

Usar `lg:grid-cols-6` com `min-w-0` nos cards, gap e padding reduzidos, e breakpoints `md:grid-cols-3` e `sm:grid-cols-2`. Essa opção atende diretamente ao requisito de seis cards em uma linha e mantém o comportamento responsivo sem scroll horizontal.

### B — seis cards com scroll horizontal

Manter uma largura mínima confortável e permitir rolagem lateral. Preserva melhor a legibilidade em telas intermediárias, mas cria uma interação adicional e deixa parte dos indicadores fora da primeira vista.

### C — primeira linha com cards principais e segunda linha com indicadores

Dá mais espaço ao faturamento e às exclusões, porém não atende ao requisito aprovado de seis cards lado a lado.

## Design aprovado

### Componente

- Alterar somente a grade do componente `DashboardFinancialIndicators` e os estilos locais necessários no `IndicatorCard`.
- Remover a altura mínima excessiva que amplifica o card de exclusões; usar uma altura mínima uniforme e compacta para todos os cards.
- Aplicar `min-w-0` ao wrapper do card e aos blocos textuais para permitir compressão segura dentro da coluna.
- Manter o card de devoluções com fundo e tipografia de erro, com o valor monetário sem quebra de linha.
- Manter o editor de custos fora da grade, na mesma posição abaixo dos indicadores.

### Responsividade

- Desktop: `lg:grid-cols-6`.
- Tablet: `md:grid-cols-3`.
- Mobile: `sm:grid-cols-2`, reduzindo para uma coluna quando a largura não comportar duas.
- Nenhum conteúdo deve exigir largura fixa ou gerar overflow horizontal.

### Testes e validação

Atualizar o teste do componente para verificar:

1. os seis rótulos presentes;
2. o card de exclusões separado do card de faturamento;
3. valor, descrição e quantidade das exclusões preservados;
4. classes de grid desktop e breakpoints responsivos;
5. demais valores e tendências preservados.

Executar teste do componente, lint, typecheck e build do web app. Revisar o diff final para garantir que não haja alteração de contrato ou backend.

## Fora de escopo

- Alterações na API ou no cálculo financeiro.
- Mudanças nos filtros do dashboard.
- Nova dependência, migração ou alteração de tema global.
