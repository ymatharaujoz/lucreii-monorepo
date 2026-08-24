# Persistência do Exemplo Prático de ROAS de Equilíbrio

## Resumo

Persistir Investimento em Ads, ROAS e Faturamento Atribuído aos Ads junto às
simulações de ROAS de Equilíbrio. Novas simulações começam com esses campos
vazios, mas podem ser salvas; registros antigos continuam sem dados históricos
e exibem `—`.

## Decisões

- Adicionar três colunas decimais opcionais à tabela
  `break_even_roas_simulations`.
- Normalizar valores no backend e calcular o faturamento como
  `investimento × ROAS` quando ambos os valores forem informados.
- Retornar os campos em todos os endpoints de simulação, incluindo listagem,
  detalhe, criação e edição.
- Rejeitar valores negativos; campos vazios serão representados como `null`.
- Carregar os valores persistidos no formulário de edição e manter o layout
  premium atual.

## Validação

- Migration e schema devem preservar registros existentes sem preenchimento
  artificial.
- Validation, serviço e componente devem cobrir valores vazios, válidos e
  negativos, além do cálculo derivado.
- Executar testes focados, typecheck, lint e build do web/API/database.
