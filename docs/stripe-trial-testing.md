# Trial grátis sem cartão

## Objetivo

O trial da Lucreii é interno: começa na criação da conta, dura exatamente sete
dias e não exige cartão nem chamada à Stripe. A Stripe é a fonte de verdade
apenas para assinaturas pagas.

O registro em `billing_trials` é único por usuário e e-mail, contém
`trial_started_at`, `trial_ends_at` e é associado ao workspace quando o owner
conclui o onboarding.

## Configuração

Crie quatro Prices recorrentes mensais, ativos e na moeda BRL, no Stripe:

| Plano | Valor |
| --- | ---: |
| Start | R$ 49,90/mês |
| Essencial | R$ 99,90/mês |
| Pro | R$ 179,90/mês |
| Business | R$ 249,90/mês |

Configure somente os IDs mensais:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_START_MONTHLY=price_...
STRIPE_PRICE_ESSENCIAL_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
WEB_APP_ORIGIN=http://localhost:3000
```

Antes do deploy, aplique a migração:

```bash
corepack pnpm db:migrate
```

Não há Price ou Checkout para Enterprise: esse plano abre contato com um
especialista.

## Webhooks locais

```bash
stripe login
stripe listen --forward-to localhost:4000/billing/stripe/webhook
```

Copie o `whsec_...` exibido para `STRIPE_WEBHOOK_SECRET`. Habilite em produção:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Cenários de validação

1. Crie uma conta. Confirme que não há Checkout, cartão ou cliente Stripe e que
   `billing_trials` tem início e fim separados por sete dias.
2. Conclua o onboarding. Confirme que o mesmo trial foi ligado ao workspace e
   que o Dashboard abre com a faixa “Seu teste termina em N dias”.
3. Confirme que um membro que não é owner não vê “Ver planos” e recebe `403`
   ao chamar checkout ou portal diretamente.
4. Com mais de 48 horas restantes, escolha um plano. O Checkout deve coletar
   cartão e criar uma assinatura com `trial_end` igual a `trial_ends_at`.
5. Com menos de 48 horas restantes, o Checkout deve usar modo `setup`; após a
   confirmação, a API cria uma assinatura idempotente com o mesmo `trial_end`.
6. Depois do vencimento, confirme que APIs protegidas retornam `402`, o app
   redireciona a `/app/billing`, e o Checkout cria assinatura sem `trial_end`.
7. Use `4242 4242 4242 4242` no Sandbox para sucesso. Para falha posterior,
   use `4000 0000 0000 0341`, avance a simulação/Test Clock e confirme que
   `past_due` bloqueia acesso até a Stripe retornar `active`.

## Diagnóstico

- Checkout antes do fim falha perto da expiração: verifique se a API escolheu
  `mode: setup` com menos de 48 horas; Checkout não aceita `trial_end` menor.
- Cobrança acontece antes da data original: compare `trial_ends_at` com
  `subscription.trial_end` no Stripe.
- Interface desatualizada: consulte `GET /billing/subscription`; a resposta
  contém o objeto `trial` e o entitlement calculado no servidor.

## Referências

- [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions/create)
- [Subscriptions API](https://docs.stripe.com/api/subscriptions/create)
- [Stripe test clocks](https://docs.stripe.com/billing/testing/test-clocks)
