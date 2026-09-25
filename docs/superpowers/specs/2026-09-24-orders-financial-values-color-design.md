# Cores semânticas para margem e lucro na tabela de pedidos

## Objetivo

Facilitar a leitura dos resultados financeiros em `/app/marketplaces`, destacando margem de contribuição e lucro total conforme seu sinal, com cores semânticas já existentes na aplicação.

## Comportamento esperado

- Margem de contribuição maior que zero e lucro total maior que zero usam `text-success`.
- Margem de contribuição menor que zero e lucro total menor que zero usam `text-error`.
- Valores iguais a zero mantêm a cor padrão da tabela.
- Valores ausentes mantêm o traço `—` e a cor padrão.
- Formatação, ordenação, dados e demais colunas permanecem inalterados.

## Arquitetura e escopo

Alterar somente as classes das duas células financeiras em `apps/web/src/modules/orders/components/orders-home.tsx`. Reutilizar os tokens Tailwind mapeados para `--success` e `--error` em `apps/web/src/app/globals.css`. Não alterar cálculos, contratos, APIs, banco de dados ou outras telas.

## Critérios de aceite

- Valores positivos nas colunas `Margem Contribuição` e `Lucro Total` aparecem em verde semântico.
- Valores negativos nas duas colunas aparecem em vermelho semântico.
- Zero, traço e valores ausentes mantêm aparência neutra.
- Nenhuma outra célula da tabela muda de cor ou comportamento.
- O teste existente da tabela cobre os estados positivo, negativo e neutro para as duas colunas.
- Teste de componente, typecheck e ESLint do componente passam.
