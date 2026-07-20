# Correção do imposto em pedidos Mercado Livre importados por planilha

## Diagnóstico

O importador passou a gravar `metadata.importedTaxAmount` com o valor da comissão líquida após subtrair o Custo Fixo. A leitura financeira prioriza esse campo, fazendo o cartão `IMPOSTO` repetir a comissão.

## Decisão

Para pedidos `mercadolivre` com origem `spreadsheet`, o imposto deve seguir a mesma regra dos demais pedidos: faturamento importado da coluna `Receita por produtos (BRL)` multiplicado pela alíquota padrão da empresa. O valor legado `importedTaxAmount` será ignorado nesse escopo, para corrigir registros já persistidos sem migração manual. Novas importações deixarão de gravar esse campo.

O cálculo de comissão e os demais provedores permanecem inalterados. Pedidos Flex ainda podem manter imposto pendente igual a zero enquanto o Custo Fixo não for resolvido, conforme regra existente.

## Validação

Teste de regressão deve comprovar, para o pedido `2000013480723293`, faturamento de `R$ 39,90`, comissão de `R$ 4,59` e imposto de `R$ 3,99` com alíquota de 10%.
