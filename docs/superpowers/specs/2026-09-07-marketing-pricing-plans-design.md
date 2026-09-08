# Marketing Pricing Plans Design

## Objective

Atualizar somente a seção de planos da página pública de marketing para refletir o novo modelo mensal da Lucreii, mantendo o visual premium, responsivo e com animações sutis.

## Current behavior

- A landing page usa `BILLING_PLANS`, compartilhado com billing, contendo três planos.
- A seção possui alternância entre cobrança mensal e anual.
- Os cards atuais exibem apenas preço, descrição, CTA e lista simples de recursos.

## Expected behavior

- Exibir cinco cards: Start, Essencial, Pro, Business e Enterprise.
- Remover completamente a alternância anual e qualquer copy de plano anual.
- Exibir somente preços mensais:
  - Start: R$ 49,90/mês
  - Essencial: R$ 99,90/mês
  - Pro: R$ 179,90/mês
  - Business: R$ 249,90/mês
  - Enterprise: Sob consulta
- Todos os planos devem informar acesso a todas as funcionalidades.
- Pro deve ser destacado como “MAIS ESCOLHIDO”.
- Start, Essencial, Pro e Business devem usar “Começar agora”. Enterprise deve usar “Falar com um especialista”.
- Exibir limites de CNPJ e pedidos conforme referência:
  - Start: 1 CNPJ; até 200 pedidos/mês.
  - Essencial: 1 CNPJ; até 1.000 pedidos/mês.
  - Pro: até 3 CNPJs; até 3.500 pedidos/mês.
  - Business: até 5 CNPJs; até 7.500 pedidos/mês.
  - Enterprise: 6+ CNPJs; acima de 7.500 pedidos/mês.
- Exibir benefícios dos cards conforme a referência visual.
- Adicionar faixa de benefícios gerais e dois cards explicativos abaixo dos planos.

## Architecture

- Criar `MarketingPricingSection` em `apps/web/src/components/marketing/`.
- Manter dados de apresentação dos planos locais ao marketing.
- Não alterar `packages/types/src/billing.ts`, Stripe, API, schema ou fluxo de assinatura.
- `LandingPage` renderizará a nova seção e deixará de controlar o estado de billing mensal/anual.
- CTAs existentes de entrada continuam apontando para `/sign-in`; o CTA Enterprise reutilizará o fluxo de contato/WhatsApp existente, com o rótulo definido pela referência.

## Visual and responsive behavior

- Desktop amplo: cinco colunas alinhadas.
- Breakpoints menores: três, duas e uma coluna, sem overflow horizontal.
- Cards terão estrutura alinhada: ícone, título, descrição, preço, CTA, limites, divisor e benefícios.
- Pro usará borda/acento, fundo suave e badge superior.
- Usar tokens visuais já existentes (`accent`, `border`, `surface`, `muted`).
- Usar entrada escalonada e hover discreto com Framer Motion.
- Respeitar `prefers-reduced-motion`.
- Em mobile, cards empilhados e CTAs com largura adequada para toque.

## Validation

- Teste de componente para cinco planos, preços, limites, badge Pro, CTA Enterprise e ausência de “Anual”.
- Executar lint, typecheck, testes e build da aplicação web.
- Fazer inspeção visual local em desktop, tablet e mobile.
- Confirmar que alterações funcionais ficam restritas à área de marketing.
- Revisar diff antes do commit final.

## Out of scope

- Alterações em billing real, Stripe, API, banco, tipos compartilhados ou permissões.
- Criação de plano anual.
- Alteração de outras páginas públicas ou da área autenticada.
- Mudança de regras de limite no backend.

## Visual refinement — 2026-09-07

### Problem

Em larguras intermediárias, cinco colunas comprimem os cards e quebram preços,
CTAs e textos de benefícios.

### Approved change

- Trocar grid fixo por grid adaptativo com largura mínima aproximada de 240px.
- Usar cinco colunas somente quando houver espaço real; permitir quatro, três,
  duas ou uma coluna conforme viewport.
- Reforçar cards com padding, hierarquia tipográfica, divisores, sombras e
  altura uniforme por linha.
- Impedir quebra de preços monetários e preservar “Sob consulta” como variante
  textual do Enterprise.
- Manter Pro como card destacado e preservar animações sutis com suporte a
  `prefers-reduced-motion`.
- Validar em desktop amplo, tablet e mobile.
