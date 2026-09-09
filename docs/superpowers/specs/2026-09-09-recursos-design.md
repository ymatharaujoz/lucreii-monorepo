# Recursos da landing page Lucreii

## Objetivo

Refazer a seção ancorada em `#recursos` para reproduzir a imagem de referência: fundo mint claro, título central, grade de oito recursos e fechamento com a mensagem “Menos achismo. Mais controle sobre o seu lucro.”. A seção será implementada como UI React responsiva, não como imagem estática.

## Escopo

- Substituir a seção inline de recursos em `landing-page.tsx` por um componente isolado `ResourcesSection`.
- Preservar as demais seções, navegação, contratos, APIs e regras de negócio da landing page.
- Reutilizar os ícones de marketplace já disponíveis no projeto.
- Manter tema claro fiel à referência e adaptar superfícies para o tema escuro existente.

## Composição visual

1. Seção `#recursos` com `scroll-mt` compatível com o cabeçalho fixo, espaçamento amplo e overflow controlado.
2. Fundo em gradiente branco/mint com manchas orgânicas, curvas e nós decorativos de baixa opacidade.
3. Cabeçalho centralizado:
   - badge “RECURSOS”;
   - título “Tudo o que você precisa para vender com lucro.”, com a segunda linha em verde Lucreii;
   - subtítulo “Da visão geral ao resultado de cada produto, a Lucreii reúne os números que você precisa para tomar decisões mais lucrativas.”.
4. Grade desktop 4×2, tablet 2 colunas e mobile 1 coluna, com oito cards de mesma linguagem visual:
   - Lucro real do negócio;
   - Rentabilidade por produto;
   - Ponto de equilíbrio;
   - Publicidade e ROAS;
   - Gestão por marketplace;
   - Custos e despesas;
   - Devoluções;
   - Indicadores para decisões.
5. Cada card terá ícone em círculo mint, título, descrição da referência e espaçamento legível. O card de gestão por marketplace também exibirá Mercado Livre, Shopee, TikTok Shop e Shein.
6. Fechamento centralizado com linhas laterais e as frases “Menos achismo.” e “Mais controle sobre o seu lucro.”.

## Movimento e acessibilidade

- Entrada sequencial suave do badge, títulos e cards usando Framer Motion.
- Micro movimento contínuo, quase imperceptível, nas formas de fundo e ícones.
- Elevação curta no hover e feedback de escala no estado ativo dos cards.
- Animações limitadas a `transform` e `opacity`.
- `prefers-reduced-motion` desabilita movimento automático e mantém todo conteúdo visível.
- Fallback de renderização evita esconder conteúdo em ambientes sem `IntersectionObserver`.
- Elementos decorativos serão `aria-hidden`; conteúdo textual permanecerá no DOM acessível.

## Dados e comportamento

- Textos, ícones e descrições serão dados estáticos e tipados no componente.
- Não haverá chamadas de API, estados de carregamento, formulários ou novas regras de negócio.
- O item de marketplace será puramente informativo; nenhuma integração será ativada por esta seção.

## Validação

- Teste do componente verifica badge, título, subtítulo, oito cards, textos dos marketplaces e fechamento.
- Teste confirma renderização server-side/reduced-motion sem props de animação vazando para HTML.
- Executar teste específico, suíte web, typecheck, lint direcionado, build de produção e revisão visual em desktop/mobile.
- Falhas preexistentes fora da área de marketing serão reportadas sem alterações não relacionadas.

## Fora de escopo

- Alterar a seção de integrações, hero, depoimentos ou planos.
- Alterar ícones/imagens globais da marca.
- Criar novas integrações ou modificar API, banco, autenticação ou contratos.
