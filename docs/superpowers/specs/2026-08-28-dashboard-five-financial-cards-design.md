# Cinco cards financeiros no dashboard

## Contexto

O dashboard `/app` exibe quatro indicadores financeiros principais. O card `Lucro Líquido` atualmente mostra o valor monetário junto da margem líquida entre parênteses. O layout deve passar a exibir cinco cards independentes, mantendo o padrão visual atual.

## Objetivos

- Exibir cinco cards na ordem `Faturamento`, `Margem Média`, `Ponto de Equilíbrio`, `Lucro Líquido` e `Margem Líquida`.
- Manter `Lucro Líquido` somente como valor monetário.
- Exibir `Margem Líquida` como percentual em card próprio.
- Preservar características visuais, estados, animações, espaçamentos e subtextos dos cards atuais.
- Manter o ícone atual de `Ponto de Equilíbrio` (`Scale`) sem alteração.
- Evitar overflow em telas menores.

## Escopo

Alterar somente:

- `apps/web/src/modules/dashboard/components/dashboard-financial-indicators.tsx`
- `apps/web/src/modules/dashboard/components/dashboard-financial-indicators.test.tsx`

Ficam fora de escopo API, schema, tipos compartilhados, domínio, backend e componentes de marketing.

## Abordagens consideradas

### A — cinco colunas a partir de `lg`, aprovada

Usar `lg:grid-cols-5`, mantendo `sm:grid-cols-2` e o comportamento de uma coluna no mobile. Essa opção atende ao pedido de colocar o quinto card ao lado de `Lucro Líquido` e reproduz melhor a composição da imagem de referência.

### B — cinco colunas somente a partir de `xl`

Preserva mais espaço em telas próximas ao breakpoint de desktop, mas mantém quatro cards em parte das telas desktop e não atende tão bem à composição solicitada.

### C — grid fluido com larguras automáticas

Adapta larguras continuamente, porém pode produzir cards com dimensões diferentes e enfraquecer a consistência visual existente.

## Design aprovado

### Layout e componente

- Alterar o grid de `sm:grid-cols-2 lg:grid-cols-4` para `sm:grid-cols-2 lg:grid-cols-5`.
- Reutilizar `IndicatorCard`, tokens visuais, variantes, tipografia, animação e espaçamento existentes.
- Inserir novo `IndicatorCard` de `Margem Líquida` imediatamente após `Lucro Líquido`.
- Usar ícone `Percent` no novo card, seguindo a linguagem dos indicadores percentuais.
- Manter `<Scale className="h-4 w-4" />` no card `Ponto de Equilíbrio` exatamente como está.

### Dados e formatação

- `Lucro Líquido` continua derivado de `totalProfit - fixedCost` e renderiza somente `formatMoney(displayedLiquidProfit)`.
- `Margem Líquida` continua usando os valores exibidos no dashboard:

```text
Margem Líquida = Lucro Líquido exibido / Faturamento exibido × 100
```

- Arredondar lucro e faturamento para centavos antes da divisão, preservando consistência entre os valores visíveis e o percentual.
- Usar `Intl.NumberFormat("pt-BR")` com exatamente duas casas decimais.
- Quando faturamento for zero, exibir `0,00%`.
- O novo card preserva tendência positiva, negativa ou neutra com a mesma regra do lucro líquido, salvo mudança visual explicitamente necessária para o novo indicador.
- Subtexto do novo card explicita a relação `Lucro Líquido / Faturamento`.

### Testes

Atualizar o teste do componente para cobrir:

1. presença dos cinco rótulos;
2. `Lucro Líquido` sem percentual anexado;
3. margem líquida positiva com cálculo `29,32%` no cenário da imagem;
4. margem líquida negativa em cenário de prejuízo;
5. margem `0,00%` com lucro líquido zero;
6. margem `0,00%` com faturamento zero;
7. grid com cinco colunas desktop;
8. preservação da tendência e do valor monetário do lucro líquido.

## Validação

Executar, nesta ordem:

1. teste unitário do componente;
2. lint de `apps/web`;
3. typecheck de `apps/web`;
4. build de `apps/web`, se os checks anteriores passarem.

Revisar diff final para confirmar que somente componente e teste foram alterados, além desta especificação.
