# Layout premium para edição em lote do custo de pedidos

## Objetivo

Refinar somente o modal de `Editar Custo do Produto` em `/app/orders` para uma composição minimalista tipo ledger: mais hierarquia financeira, menos aparência de formulário genérico e nenhuma alteração de comportamento.

## Design aprovado

- Manter o `Modal` compartilhado sem mudanças globais; personalizar apenas título e conteúdo desta ação em lote.
- Cabeçalho mostra contexto `Alteração em lote`, título e total de pedidos selecionados em hierarquia compacta.
- Corpo usa divisores finos, não cards aninhados: contexto da aplicação, campo monetário principal e nota operacional.
- Campo `Custo por pedido` recebe maior altura, prefixo `R$` estável, tipografia numérica mais forte e foco teal discreto.
- Rodapé separa informação `Somente pedidos` das ações; `Salvar alterações` preserva destaque teal e feedback de pressionamento.
- Texto deixa explícito que custo informado é total por pedido e não altera catálogo.

## Comportamento e acessibilidade

- Preservar validação, normalização decimal brasileira, estado de carregamento, erro inline, cancelamento, Escape e fechamento por overlay existentes.
- Manter rótulos, associação `label`/input e atributos ARIA; nenhum contrato de API, cálculo financeiro ou persistência é alterado.
- Layout usa tokens de cor/sombra/raio existentes e permanece legível nos temas claro e escuro, além de telas pequenas.

## Critérios de aceitação

- Modal comunica quantidade de pedidos e escopo somente-pedidos sem competir com valor principal.
- Valor, validação, salvamento e falha da mutation conservam comportamento atual.
- Nenhum componente global de modal, catálogo ou endpoint é modificado.
