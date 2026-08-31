# Edição em lote de custo do produto em pedidos

## Objetivo

Permitir aplicar um mesmo `Custo Produto` total a vários pedidos selecionados em `/app/orders`, sem alterar custos, produtos ou cálculos padrão do catálogo em `/app/products/catalog`.

## Comportamento esperado

- A barra de seleção exibe `Editar Custo do Produto` quando houver ao menos um pedido selecionado.
- O modal informa a quantidade de pedidos, recebe valor em BRL e aceita somente zero ou valor positivo com até duas casas decimais.
- Ao confirmar, o mesmo valor total é salvo como override de composição em cada pedido selecionado.
- Pedidos agrupados do Mercado Livre preservam regra atual: custo total informado para aquele pedido lógico é distribuído entre suas linhas físicas por quantidade.
- Operação é atômica: IDs inválidos, fora da empresa selecionada ou falha de persistência impedem alteração de todo lote.
- Após sucesso, lista e indicadores são recarregados, seleção é limpa e o modal fecha.

## Contrato

- Novo endpoint protegido de atualização em lote recebe `orderIds` e `productCostAmount` decimal canônico.
- Resposta retorna quantidade de pedidos lógicos atualizados.
- Persistência continua em `metadata.compositionOverrides.productCostAmount`; não cria migração nem escreve em tabelas de produtos/custos do catálogo.

## Critérios de aceitação

- Selecionar pedidos, informar `22,50` e confirmar aplica `22.50` a cada pedido selecionado.
- Métricas de lucro e margem dos pedidos atualizados refletem o novo custo.
- `/app/products/catalog` e seus custos permanecem inalterados.
- Entrada inválida não chama API; erro de API mantém seleção/modal para nova tentativa.
- Nenhuma parte do lote é gravada quando qualquer ID não pertence à organização ou empresa atual.
