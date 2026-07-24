# Direção da Margem Média

## Objetivo

Corrigir `Margem Média` no `/app`, que atualmente calcula `Faturamento / Lucro Total`. A regra correta é:

```text
Lucro Total / Faturamento × 100
```

Assim, `R$ 300,06 / R$ 894,48` deve resultar em `33,55%`.

## Decisão

Corrigir a origem em `packages/domain/src/financial-indicators.ts`, usando o formatador percentual existente para calcular `totalProfit / revenue`. O componente React continua apenas apresentando o valor recebido, sem duplicar regra de negócio.

O Ponto de Equilíbrio continuará usando a margem média percentual arredondada:

```text
Custo Fixo / (Margem Média / 100)
```

Margem média igual ou menor que zero continua retornando ponto de equilíbrio zero.

## Validação

- Teste de domínio confirma margem média `33,55%` para `R$ 300,06 / R$ 894,48`.
- Testes derivados confirmam ponto de equilíbrio recalculado com a margem corrigida.
- Teste do card confirma percentual exibido no `/app`.
- Teste afetado da API, typecheck e lint dos arquivos alterados serão executados.

## Escopo

Alterar cálculo de margem média, valores derivados diretamente afetados e expectativas de teste. Não alterar layout, contratos externos ou regras financeiras não relacionadas.
