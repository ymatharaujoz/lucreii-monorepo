# Tooltip de CMV no ROI

## Objetivo

Na aba **Lucratividade** do modal de detalhes de produto, exibir um ícone de ajuda ao lado do rótulo **ROI**. O ícone revela um tooltip somente em hover ou foco por teclado.

## Comportamento

- Ícone de ajuda visual `ⓘ` ao lado de `ROI`.
- Gatilho semântico: botão com rótulo acessível `Explicação sobre CMV`.
- Tooltip abre ao passar mouse ou receber foco e fecha ao sair ou perder foco.
- Conteúdo exato:

  `CMV (Custo da Mercadoria Vendida): Valor investido na compra das unidades vendidas.`

## Implementação

- Reusar `Tooltip` de `@lucreii/ui`; não criar componente local nem usar `title` nativo.
- Permitir que `MetricCard` receba `label` como `ReactNode`, preservando os rótulos de texto existentes.
- No card de ROI, compor o rótulo com `Tooltip` e botão do ícone de ajuda.
- Não alterar cálculos, formatação do ROI, demais cards ou abas.

## Validação

- Teste do modal abre aba Lucratividade e encontra botão de ajuda pelo nome acessível.
- Teste confirma texto do tooltip após foco ou hover do botão.
- Executar teste unitário do modal e lint/typecheck aplicável ao app web.
