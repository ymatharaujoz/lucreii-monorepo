# Ponto de Equilíbrio por Margem Média

## Objetivo

Corrigir o valor exibido em `PONTO DE EQUILÍBRIO` no `/app` para usar a fórmula solicitada:

```text
custo fixo / margem média
```

Como a margem média é exibida em percentual, a implementação deve dividir pelo percentual convertido para fração. Exemplo: `R$ 200,00 / 2,98% = R$ 6.711,41`.

## Decisão

Manter a regra no domínio financeiro, em `packages/domain/src/financial-indicators.ts`, evitando cálculo duplicado na camada React. O cálculo usará a mesma margem média já fornecida pelo domínio, interpretada como percentual:

```text
breakEvenRevenue = fixedCost / (averageMarginPercent / 100)
```

Margem média igual ou menor que zero retorna `0`, preservando o comportamento seguro existente.

## Apresentação

O card de `/app` continuará usando `formatMoney`, com configuração explícita para moeda brasileira e duas casas decimais. O resultado esperado será `R$ 6.711,41`, com separador decimal brasileiro e prefixo `R$`.

## Validação

- Teste de domínio comprova `R$ 200,00 / 2,98% = R$ 6.711,41`.
- Testes de domínio cobrem margem zero/negativa.
- Teste do componente comprova valor formatado com `R$` e duas casas.
- Suíte direcionada de domínio e dashboard será executada antes do envio.

## Escopo

Alterar somente cálculo, expectativas de teste e apresentação diretamente relacionada ao indicador. Não alterar semântica de outros indicadores nem criar novos endpoints.
