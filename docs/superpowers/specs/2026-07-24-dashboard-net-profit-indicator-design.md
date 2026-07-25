# Design: indicador Lucro Líquido no dashboard

## Contexto

O dashboard financeiro em `/app` exibe três indicadores principais: Faturamento, Margem Média e Ponto de Equilíbrio. O pedido é adicionar um quarto indicador premium, sem quebrar a responsividade, com o resultado de:

```text
Lucro Total − Custo Fixo
```

O domínio já calcula esse resultado como `realProfit`, mas o card solicitado deve se chamar `Lucro Líquido`. O campo `netProfit` e a auditoria financeira mantêm suas semânticas atuais, incluindo publicidade; o novo card terá a fórmula visível para remover ambiguidade.

## Objetivos

- Exibir um quarto card em `apps/web` com rótulo `Lucro Líquido`.
- Calcular o valor a partir de `totalProfit - fixedCost`.
- Preservar valores negativos, zero e casas decimais monetárias.
- Manter o layout estável em mobile, tablet e desktop.
- Reutilizar componentes, tokens visuais e dependências já presentes.

## Fora de escopo

- Alterar API, schema de validação ou tipos compartilhados.
- Renomear ou redefinir `netProfit`.
- Alterar a auditoria financeira existente.
- Adicionar dependências de UI ou animação.

## Abordagens consideradas

### A — derivação local no card, aprovada

Derivar `liquidProfit` dentro de `DashboardFinancialIndicators`, usando os valores já recebidos e a função de normalização existente. Essa abordagem limita a mudança ao fluxo visual, mantém o contrato da API estável e garante que a fórmula do requisito esteja explícita no ponto de uso.

### B — novo campo na API

Adicionar um campo dedicado ao contrato financeiro e propagá-lo por domínio, API, validação e frontend. A separação semântica seria mais forte, mas amplia o escopo para um indicador que já pode ser calculado com dados disponíveis.

### C — reutilizar diretamente `realProfit`

Exibir `financialIndicators.realProfit` com novo rótulo. É a menor alteração, porém esconde a fórmula no componente e aumenta o risco de divergência futura entre o contrato de domínio e a regra explícita solicitada.

## Design aprovado

### Layout

- Inserir o novo card no mesmo grid dos indicadores atuais.
- Ajustar o breakpoint desktop para quatro colunas (`lg:grid-cols-4`).
- Preservar uma coluna no mobile e duas no tablet.
- Manter espaçamento, bordas, sombras, tipografia e animação existentes.
- Evitar largura fixa ou conteúdo que force overflow.

### Dados e fórmula

```ts
const liquidProfit = normalizeNumber(financialIndicators.totalProfit) -
  normalizeNumber(financialIndicators.fixedCost);
```

O valor será formatado por `formatMoney` com duas casas decimais. A área auxiliar do card exibirá `Lucro Total − Custo Fixo`, tornando clara a definição específica desse indicador.

### Estado visual

- Valor maior que zero: variante de sucesso e indicação positiva.
- Valor menor que zero: variante de erro e indicação de prejuízo.
- Valor igual a zero: variante de atenção e indicação neutra.

O card utilizará ícone já disponível em `lucide-react`, sem importar biblioteca nova.

### Testes

Atualizar o teste do componente para verificar:

1. presença do quarto indicador e rótulo `Lucro Líquido`;
2. cálculo positivo usando valores diferentes de `realProfit`/`netProfit`;
3. preservação do sinal negativo;
4. estado neutro para resultado zero;
5. presença do grid responsivo.

## Validação

- Executar o teste unitário do componente.
- Executar lint e typecheck de `apps/web`.
- Executar build do app se os checks locais forem concluídos sem erro.
- Revisar diff para confirmar que a mudança ficou restrita ao indicador e seus testes.
