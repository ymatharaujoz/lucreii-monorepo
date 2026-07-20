# Design: seção de integrações premium

## Objetivo

Elevar `/app/integrations/` para um workspace editorial e profissional, mantendo todos os fluxos existentes de conexão, desconexão, consulta de status, sincronização por período e importação por planilha.

## Direção aprovada

**Editorial command center**: hero assimétrico, prioridade visual para saúde das integrações e uma ação operacional principal. Superfícies claras, base neutra com acento teal existente e uso controlado das cores de marca dos marketplaces.

Animações seguem intensidade discreta: entrada em cascata, hover com elevação curta, transições de conteúdo e feedback de ação. Toda animação respeita `prefers-reduced-motion`.

## Escopo

Alterações restritas à camada web da seção de integrações:

- `IntegrationsHub`: composição da página, ritmo vertical, agrupamento de status e ações, troca animada entre modos.
- `IntegrationsHeader`: hero editorial e resumo visual das conexões.
- `ConnectedMarketplacesSection`: hierarquia dos cards, densidade, estados e ações.
- `SyncStatusGrid`: leitura dos indicadores com destaque para o dado mais importante.
- `SyncControlCard`: painel operacional para período, disponibilidade e última execução.
- `SpreadsheetImportCard`: painel operacional para seleção, progresso, resultado e erros.
- `lib/animations.ts` somente se necessário para centralizar variantes reutilizáveis.

Não haverá mudança em API, contratos, mutations, regras de negócio, autenticação, dependências ou esquema de dados.

## Composição da página

1. **Hero**
   - Eyebrow de contexto operacional.
   - Título de presença maior, com `text-wrap: balance` e largura controlada.
   - Descrição curta com limite de leitura.
   - Rail lateral com contagem de conexões ativas, estado agregado e última atividade quando disponível.
   - Mobile transforma o rail em uma faixa compacta abaixo do título.

2. **Marketplaces conectados**
   - Seção visual principal logo após o hero.
   - Cards mantêm logos, status, conta, última sincronização e ações existentes.
   - Estado conectado recebe superfície clara, borda sutil e glow de marca com baixa opacidade.
   - Estado desconectado, reconexão necessária e indisponível continuam visualmente distintos sem criar ruído.
   - Grid responsivo: composição arejada em telas largas; duas colunas em tablet; uma coluna no mobile.

3. **Deck operacional**
   - Status da sincronização e controles de ação deixam de parecer blocos independentes separados por divisores.
   - Em desktop, status ocupa área principal e ações ocupam área de apoio; em mobile, empilham.
   - Seletor de marketplace permanece funcional e ganha tratamento de segmented control.
   - Seletor de ação alterna entre sincronização por período e importação por planilha.

4. **Mensagens**
   - Feedback de sucesso/erro permanece no topo do fluxo, com entrada e saída suaves.
   - Mensagens críticas conservam contraste e semântica `role="status"`.

## Motion

- Entrada inicial: hero, marketplaces, status e ações aparecem em cascata curta com `opacity` + `transform`.
- Cards: `translateY(-3px)` no hover, sombra colorida/tintada e duração aproximada de 220–300ms.
- Controles: feedback de press com escala próxima de `0.98`; foco visível sempre preservado.
- Troca de tabs/modos: `AnimatePresence` com transição `opacity` + deslocamento curto, sem animar `width`, `height`, `top` ou `left` diretamente.
- Estados de carregamento: skeletons existentes recebem a mesma geometria final dos componentes.
- Sem loops decorativos permanentes. Spinners ficam restritos a operações ativas.
- `prefers-reduced-motion`: desabilita deslocamentos e reduz transições ao mínimo já previsto no CSS global.

## Dados e comportamento

O fluxo permanece controlado por `useIntegrationsData` e pelos callbacks atuais do `IntegrationsHub`:

- `integrationsQuery` alimenta hero e cards.
- `syncStatusQuery` alimenta status, disponibilidade e última execução.
- `connectMutation` e `disconnectMutation` preservam busy state por provider.
- `syncMutation` mantém validação de intervalo, payload e feedback de sucesso/erro.
- `spreadsheetImport` mantém seleção, progresso, resultado idempotente e erros parciais.

Mudanças visuais não devem duplicar fetches, resetar seleção de provider, remover mensagens ou alterar disponibilidade de ação.

## Acessibilidade e responsividade

- HTML semântico para agrupamento de seções e headings.
- Estados de foco visíveis em tabs, botões, inputs e dropzone.
- Tabs continuam navegáveis por teclado e comunicam estado selecionado.
- Texto de status continua legível em tema claro e escuro.
- Cards não dependem apenas de cor para comunicar estado.
- Layout sem largura fixa rígida; conteúdo limitado por container responsivo.
- Mobile evita overflow horizontal e mantém CTA de ação em largura confortável.

## Verificação

- Executar testes existentes da seção de integrações.
- Adicionar ou ajustar testes somente para comportamento visual-interativo novo: modo de ação, preservação de provider selecionado e estados de loading/erro.
- Rodar `lint`, `typecheck` e testes do app web.
- Verificar visualmente em desktop e mobile no browser local, incluindo modo escuro e `prefers-reduced-motion`.

## Fora de escopo

- Alteração de backend, API, autenticação ou regras de sincronização.
- Instalação de novas bibliotecas.
- Redesign global do app shell ou de outras páginas.
- Mudança de copy de negócio além de ajustes necessários para hierarquia visual.
