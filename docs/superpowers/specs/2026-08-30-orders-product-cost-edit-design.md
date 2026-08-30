# Edição de custo do produto no detalhe do pedido

## Objetivo

Permitir editar o campo `Custo Produto` no modal de detalhes de `/app/orders` com múltiplos dígitos e valores decimais no formato brasileiro, sem truncar ou reformatar o texto enquanto o usuário digita.

## Comportamento atual

O campo é controlado por estado React e aplica sanitização durante cada evento `onChange`. Essa transformação pode alterar o valor intermediário e impedir a digitação contínua de números com mais de um dígito.

## Comportamento esperado

- Usuário consegue digitar sequências como `22`, `22,50` e `22.50`.
- Campo aceita somente dígitos e separadores decimais (`.`, `,`) durante a edição.
- Texto não é formatado novamente a cada tecla; cursor e valor intermediário permanecem sob controle do usuário.
- Ao salvar, valor é convertido para decimal canônico com ponto e enviado à API com duas casas (`22.50`).
- Valor deve ser zero ou positivo e conter no máximo duas casas decimais.
- API, banco e regras server-side permanecem inalterados.

## Requisitos funcionais

1. Remover a sanitização que reescreve o valor a cada `onChange`.
2. Manter filtro de caracteres inválidos no teclado e considerar colagem/entrada programática no salvamento.
3. Reutilizar `parseCurrencyValue` para converter separadores brasileiros antes da validação.
4. Preservar mensagem de erro para valor vazio, negativo ou com mais de duas casas.
5. Manter payload atual da mutation: `productCostAmount` como string decimal com duas casas.

## Regras e casos-limite

- `22` deve salvar como `22.00`.
- `22,50` e `22.50` devem salvar como `22.50`.
- Letras e símbolos não monetários não devem entrar no valor por teclado; conteúdo colado será validado no salvamento.
- Separadores de milhar e decimal serão interpretados pela função de parsing existente, sem nova regra de domínio.
- Falha de API mantém modal aberto e mostra erro existente.

## Critérios de aceitação

- Após abrir edição, usuário digita `22` sem perder o segundo dígito.
- Usuário digita `22,50` sem truncamento ou substituição inesperada.
- Salvar `22,50` chama mutation com `{ productCostAmount: "22.50" }`.
- Valor inválido não chama mutation e exibe erro.
- Testes existentes de edição e cancelamento continuam passando.

## Abordagem escolhida

Manter estado textual durante digitação, limitar apenas caracteres claramente inválidos no input e deixar parsing, validação e normalização para o submit. Máscara por tecla foi descartada por risco de deslocar cursor; `type="number"` foi descartado por incompatibilidade com vírgula decimal do locale brasileiro.

## Escopo

Alterar componente e testes de `/app/orders`. Não alterar contrato da API, persistência, catálogo de produtos ou outros campos monetários.
