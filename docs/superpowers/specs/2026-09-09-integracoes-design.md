# Refatoração da seção de integrações — Lucreii

## Objetivo

Reconstruir a seção `#integracoes` da landing page para corresponder à referência visual fornecida, preservando a navegação existente e sem alterar APIs, banco ou contratos de negócio.

## Estrutura

- Seção isolada em `integrations-section.tsx`, usando os ícones de marketplace já existentes.
- Fundo claro em verde/mint com arcos decorativos sutis.
- Cabeçalho central com badge “INTEGRAÇÕES”, título em duas linhas e destaque verde em “A Lucreii cuida dos números.”.
- Quatro cards responsivos: Mercado Livre, Shopee, TikTok Shop e Shein.
- Cards disponíveis exibem checklist; cards futuros exibem status “Em breve” e link `#demo`.
- Bloco inferior com título de visão unificada, dashboard demonstrativo inclinado, ícones dos marketplaces e CTA “Testar grátis por 7 dias” para `/sign-in`.

## Motion e acessibilidade

- Entrada sequencial por viewport para cabeçalho, cards e bloco inferior.
- Hover com elevação e escala discretas.
- Dashboard com fade/scale e linhas internas com desenho progressivo.
- Movimento leve nos arcos e ícones decorativos.
- Estados iniciais determinísticos para evitar mismatch de hidratação.
- Duração zero e ausência de transformações quando `prefers-reduced-motion` estiver ativo.

## Dados e links

Os textos, status e números do dashboard são demonstrativos estáticos, baseados na imagem. O CTA principal aponta para `/sign-in`; notificações dos marketplaces futuros apontam para `#demo`.

## Validação

Adicionar testes para conteúdo, status, marketplaces, CTAs e navegação. Executar testes direcionados, typecheck, lint dos arquivos alterados, build e revisão visual em desktop e mobile.
