# Hero da landing page Lucreii — especificação visual

## Objetivo

Refatorar a composição visível da hero da landing page para seguir a referência fornecida em `C:/Users/ymath/Downloads/WhatsApp Image 2026-09-09 at 10.37.05 AM.jpeg`, mantendo o produto em tema claro e sem moldura de navegador ao redor do dashboard.

## Requisitos funcionais

- Exibir navbar branca arredondada com logo Lucreii, links Recursos, Integrações e Planos, e CTA Acessar.
- Exibir hero em duas colunas no desktop: mensagem/CTAs/benefícios à esquerda e prévia do dashboard à direita.
- Usar o texto de referência: “7 DIAS GRÁTIS PARA CONHECER A LUCREII”, “Veja o lucro que realmente importa.” e o parágrafo correspondente.
- Exibir quatro cards de recursos, a faixa de canais de venda e o trust bar com três itens.
- Recriar a prévia do dashboard com sidebar, seis métricas financeiras, barra de custos, gráfico financeiro e status dos marketplaces.
- Manter links e ações existentes: `/sign-in` para o CTA principal e `#demo` para contato.
- Manter responsividade e acessibilidade sem depender de uma imagem estática para conteúdo ou dados.

## Direção visual

- Fundo claro em mint/aqua com linhas e nós decorativos discretos.
- Navy para texto principal; teal Lucreii para destaque e CTAs.
- Cards brancos, bordas suaves, sombras leves e cantos arredondados.
- Dashboard renderizado como UI real, sem chrome de navegador ou moldura de dispositivo.

## Movimento

- Entrada sequenciada da cópia, CTAs, cards e painel.
- Desenho progressivo das linhas do gráfico e revelação escalonada das métricas.
- Hover sutil em cards e CTAs; decoração de fundo com flutuação lenta.
- Respeitar `prefers-reduced-motion` em todas as animações.

## Aceitação

- A primeira viewport deve reproduzir a composição da referência em desktop: navbar, hero, dashboard, cards, canais e trust bar visíveis sem dark mode.
- O dashboard não deve ser uma imagem nem aparecer dentro de mockup de navegador.
- A página deve manter os destinos de navegação atuais.
- Testes, typecheck, lint e build do app web devem passar.

## Fora de escopo

- Alterar as demais seções da landing page.
- Remover o suporte global a tema dark de áreas autenticadas do produto.
- Alterar regras de negócio, APIs ou dados persistidos.
