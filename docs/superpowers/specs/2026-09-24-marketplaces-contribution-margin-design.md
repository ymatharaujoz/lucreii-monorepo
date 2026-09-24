# Margem de Contribuição em Marketplaces

## Objetivo

Na página `/app/marketplaces`, substituir o indicador `Margem Líquida` por `Margem Contribuição` e exibir a margem de contribuição percentual.

## Comportamento esperado

- Faturamento usa `revenue` da API, já líquido de devoluções, cancelamentos e demais vendas excluídas pelo resumo financeiro.
- Custos variáveis usam o campo `variableCosts` do domínio financeiro: custo de produto, embalagem, imposto, comissão de marketplace e frete, descontado o bônus de devolução.
- Custo fixo e publicidade não entram em `variableCosts` nem no cálculo deste indicador.
- A fórmula é `(revenue - variableCosts) / revenue * 100`.
- Exibir percentual com duas casas decimais e formatação `pt-BR`; faturamento zero resulta em `0,00%`, e margens negativas permanecem negativas.
- Exibir também somente o valor de contribuição `revenue - variableCosts` em reais, com duas casas decimais, abaixo do percentual; não mostrar fórmula ou rótulo textual no valor.
- O cálculo vale para a visão consolidada e para cada marketplace selecionado.
- Os cards `Custo & Imposto`, `Tarifa de Venda` e `Frete Total` exibem seus valores com sinal negativo e estilo vermelho igual ao card `Devoluções`.
- No card `Custo & Imposto`, valores de `Custo` e `Imposto` nos detalhes também aparecem negativos. Valores zero permanecem `R$ 0,00`, sem sinal negativo.

## Arquitetura

- Reutilizar `revenue` e `variableCosts` já entregues em `DashboardFinancialIndicators`.
- Alterar os cards de margem e custos da variante `marketplace` em `DashboardFinancialIndicators`; preservar a grade e os cálculos de `/app` e os demais cards de `/app/marketplaces`.
- Não alterar API, banco, contratos, nem definição de custos do domínio.

## Critérios de aceite

- O card em `/app/marketplaces` chama-se `Margem Contribuição`.
- O percentual corresponde a `(faturamento líquido - custos variáveis) / faturamento líquido`, exibido com duas casas decimais.
- O card exibe o valor monetário `faturamento líquido - custos variáveis` em `R$`, com duas casas decimais, junto do percentual.
- Faturamento zero exibe `0,00%`; margem negativa mantém sinal negativo.
- A tela continua usando a mesma regra com todos os marketplaces ou um canal específico.
- Custo, imposto, tarifa e frete aparecem negativos; os três cards de custo usam a mesma variante vermelha de `Devoluções`.
- Valor zero nos cards de custo não exibe sinal negativo.
- Indicadores do Dashboard `/app` e os demais cards permanecem inalterados.

## Fora de escopo

- Incluir publicidade ou custo fixo nos custos variáveis.
- Alterar os cálculos financeiros de origem, filtros, API, banco, edição de publicidade, ranking ou pedidos.
