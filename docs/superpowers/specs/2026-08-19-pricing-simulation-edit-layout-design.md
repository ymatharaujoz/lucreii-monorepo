# Design: Tela de edição de simulações

## Objetivo

Remover a duplicidade visual entre o cabeçalho da página de edição e o cabeçalho interno da calculadora, além de padronizar a ação de exclusão da simulação.

## Decisão visual

A tela seguirá a opção B validada no companion visual:

- A página de detalhe será a dona do cabeçalho principal.
- O cabeçalho exibirá o contexto `Editar simulação · [modo]`, o produto, o status do cenário e a descrição curta.
- As ações do cenário ficarão agrupadas no lado direito do cabeçalho.
- `Excluir simulação` usará o componente `Button` com variante `danger`, tamanho `sm`, ícone `Trash2` e espaçamento alinhado às demais ações.
- A calculadora será renderizada em modo incorporado (`embedded`), ocultando seu próprio título, breadcrumb e cabeçalho duplicado.
- A calculadora manterá apenas a barra interna de edição com feedback, `Limpar` e `Salvar alterações`.

## Fluxo e estados

- O link de retorno continuará no topo e levará à biblioteca de simulações.
- O estado `Editando` continuará visível no contexto da página.
- O modal de exclusão, confirmação explícita, bloqueio durante loading e erro inline permanecerão inalterados.
- O salvamento continuará atualizando o cache do detalhe e invalidando a lista de simulações.
- Nenhum dado, rota ou contrato de API será alterado.

## Componentes e limites

- `PricingSimulationDetailPage` continuará responsável pelo cabeçalho do cenário, consulta, exclusão e modal.
- `PricingCalculator` receberá `embedded` nessa tela para reutilizar apenas a composição interna de edição.
- Não será criada uma nova abstração de layout; a mudança reutilizará `Button`, `Badge`, animações e tokens visuais existentes.

## Responsividade e acessibilidade

- O cabeçalho continuará empilhando conteúdo e ações em telas menores.
- O botão de exclusão manterá texto visível, foco acessível e estado desabilitado durante a requisição.
- O comportamento de `prefers-reduced-motion` existente será preservado.

## Validação

- Verificar visualmente que existe apenas um título principal e um subtítulo de contexto.
- Verificar que `Excluir simulação` está alinhado ao grupo de ações e usa a variante visual de perigo.
- Executar testes focados, typecheck e lint dos arquivos alterados.
