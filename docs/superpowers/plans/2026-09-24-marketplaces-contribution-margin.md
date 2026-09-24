# Margem de Contribuição em Marketplaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir em `/app/marketplaces` margem de contribuição calculada sobre faturamento líquido, com duas casas decimais.

**Architecture:** Reutilizar `revenue`, `variableCosts` e os valores arredondados que o componente já recebe e calcula. Alterar somente o card da variante `marketplace`; manter `/app`, serviços e contrato da API sem mudanças.

**Tech Stack:** React, TypeScript, Vitest, pnpm.

---

## Arquivos

- Modificar `apps/web/src/modules/dashboard/components/dashboard-financial-indicators.test.tsx` para cobrir percentual, valor em reais, rótulo, faturamento zero, margem negativa e filtro por canal.
- Modificar `apps/web/src/modules/dashboard/components/dashboard-financial-indicators.tsx` para apresentar percentual e valor monetário sem rótulo textual ou fórmula na variante Marketplaces.
- Nenhuma alteração de API, domínio, banco ou tipos necessária: `variableCosts` já representa produto, embalagem, imposto, comissão, frete e bônus de devolução.

### Task 1: Fixar comportamento em testes

**Arquivos:**
- Modificar `apps/web/src/modules/dashboard/components/dashboard-financial-indicators.test.tsx`

- [x] **Passo 1: Atualizar expectativa do card consolidado**

No teste `exibe custos operacionais separados em Marketplaces`, substituir as expectativas de `Margem Líquida` e `27,65%` por `Margem Contribuição`, `R$ 7.764,15` e `28,38%`. Confirmar ausência da fórmula textual e do rótulo `Valor:`. Trocar também o rótulo correspondente no array que valida a ordem dos seis indicadores. A fixture usa `revenue: "27359.77"` e `variableCosts: "19595.62"`; a diferença é `R$ 7.764,15` e o percentual arredonda para `28,38%`.

- [x] **Passo 2: Cobrir canal selecionado**

No teste `mantém os indicadores operacionais ao filtrar um Marketplace`, exigir `Margem Contribuição`, `R$ 7.764,15` e `28,38%`, e remover a expectativa de `Margem Líquida`.

- [x] **Passo 3: Cobrir faturamento zero e margem negativa**

Adicionar estes casos ao mesmo arquivo:

```tsx
it("exibe margem de contribuição zero quando faturamento é zero", () => {
  const view = mount(
    <DashboardFinancialIndicators
      activeCompany={company}
      financialIndicators={{
        ...indicators,
        revenue: "0.00",
        variableCosts: "100.00",
      }}
      indicatorMode="marketplace"
    />,
  );

  const text = document.body.textContent ?? "";
  expect(text).toContain("Margem Contribuição");
  expect(text).toContain("0,00%");
  expect(text).toContain("-R$ 100,00");
  expect(text).not.toMatch(/NaN|Infinity/);
  view.unmount();
});

it("preserva margem de contribuição negativa sem subtrair custo fixo", () => {
  const view = mount(
    <DashboardFinancialIndicators
      activeCompany={company}
      financialIndicators={{
        ...indicators,
        fixedCost: "25.00",
        revenue: "100.00",
        totalProfit: "-50.00",
        variableCosts: "150.00",
      }}
      indicatorMode="marketplace"
    />,
  );

  const text = document.body.textContent ?? "";
  expect(text).toContain("-50,00%");
  expect(text).toContain("-R$ 50,00");
  view.unmount();
});
```

- [x] **Passo 4: Executar teste e confirmar falha antes da correção**

Executar `corepack pnpm --filter @lucreii/web test src/modules/dashboard/components/dashboard-financial-indicators.test.tsx`.

Esperado: falha nas expectativas do card Marketplaces, pois o componente ainda mostra margem líquida e usa lucro após custo fixo.

### Task 2: Exibir fórmula de contribuição no card Marketplaces

**Arquivos:**
- Modificar `apps/web/src/modules/dashboard/components/dashboard-financial-indicators.tsx`

- [x] **Passo 1: Usar valores de contribuição no card da variante Marketplace**

No ramo `isMarketplaceIndicatorMode`, atualizar o `IndicatorCard` da margem para usar os valores já calculados no componente:

```tsx
<IndicatorCard
  icon={<Percent className="h-4 w-4" />}
  label="Margem Contribuição"
  subValue={formatMoney(contributionProfit, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}
  trend={{
    direction:
      contributionProfit > 0
        ? "up"
        : contributionProfit < 0
          ? "down"
          : "neutral",
    value:
      contributionProfit > 0
        ? "Contribuição positiva"
        : contributionProfit < 0
          ? "Contribuição negativa"
          : "Contribuição neutra",
  }}
  value={formatNetMarginPercent(contributionMarginPercent)}
  variant={
    contributionProfit > 0
      ? "success"
      : contributionProfit < 0
        ? "error"
        : "warning"
  }
/>
```

`contributionMarginPercent` divide `(displayedRevenue - displayedVariableCosts)` por `displayedRevenue` e retorna zero quando faturamento é zero. `contributionProfit` é exibido como valor em reais no detalhe do card, sem rótulo textual; `formatMoney` recebe duas casas decimais. `formatNetMarginPercent` garante percentual com duas casas no padrão `pt-BR`.

- [x] **Passo 2: Reexecutar teste de componente**

Executar `corepack pnpm --filter @lucreii/web test src/modules/dashboard/components/dashboard-financial-indicators.test.tsx`.

Esperado: todos os testes do componente passam, incluindo percentual e valor em reais no card consolidado e no canal filtrado, faturamento zero, margem negativa e indicadores de `/app`.

- [x] **Passo 3: Verificar tipos, lint e build web**

Executar os comandos:

```powershell
corepack pnpm --filter @lucreii/web typecheck
corepack pnpm --filter @lucreii/web exec eslint src/modules/dashboard/components/dashboard-financial-indicators.tsx src/modules/dashboard/components/dashboard-financial-indicators.test.tsx
corepack pnpm --filter @lucreii/web build
```

Esperado: os três comandos terminam com código zero.

- [x] **Passo 4: Revisar diff e critérios de aceite**

Executar `git diff --check` e revisar `git diff`. Confirmar que só o card Marketplaces e seus testes mudaram; `/app`, os demais cards e os contratos permanecem intactos.

## Revisão do plano

- O rótulo, percentual, valor monetário, precisão, faturamento zero, margem negativa, visão consolidada e filtro de canal são cobertos pelas tarefas acima.
- `variableCosts` e `revenue` permanecem como fontes de cálculo; custo fixo e publicidade ficam fora.
- O Dashboard `/app` e os outros indicadores não recebem alterações.
- O documento não contém placeholders e mantém nomes de campos e caminhos existentes.
