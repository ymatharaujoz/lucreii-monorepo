# Margem Líquida no card de Lucro Líquido

## Contexto

O dashboard `/app` já exibe o valor de `Lucro Líquido` no quarto card financeiro. O card deve também mostrar, ao lado do valor monetário, a margem líquida calculada a partir dos valores visíveis na tela.

## Regra

```text
Margem Líquida = Lucro Líquido exibido / Faturamento exibido × 100
```

O valor de `Lucro Líquido` exibido é derivado pelo card como `totalProfit - fixedCost`. O valor de `Faturamento` é `financialIndicators.revenue`. Quando o faturamento for zero, a margem será `0,00%` para evitar divisão por zero.

Exemplo esperado:

```text
R$ 6.087,99 (29,32%)
```

## Design aprovado

- Calcular a margem localmente no componente `DashboardFinancialIndicators`, usando os mesmos números que alimentam os valores visíveis.
- Não reutilizar `financialIndicators.netMarginPercent`, pois esse campo pode representar uma base financeira diferente da regra visual solicitada.
- Renderizar margem na mesma linha do valor monetário, entre parênteses.
- Usar locale `pt-BR` e sempre duas casas decimais.
- Preservar subtexto, tendência, variantes de cor e layout existentes.

## Testes

Atualizar o teste do componente para verificar:

1. margem positiva de `29,32%` para `R$ 6.087,99 / R$ 20.762,92`;
2. margem negativa com prejuízo;
3. margem `0,00%` quando lucro líquido for zero;
4. margem `0,00%` quando faturamento for zero;
5. exibição da margem ao lado do valor monetário.

## Escopo

Alterar somente o componente visual e seus testes. Não alterar API, schema, tipos compartilhados ou regras financeiras do backend.
