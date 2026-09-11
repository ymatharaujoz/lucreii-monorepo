"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { pricingPlans } from "@/lib/site";

const easeOut = [0.16, 1, 0.3, 1] as const;

function CheckIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PricingCard({
  plan,
  index,
}: {
  plan: (typeof pricingPlans)[0];
  index: number;
}) {
  const price = plan.monthlyPrice;
  const suffix = plan.monthlySuffix;
  const isFeatured = Boolean(plan.featured);

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: easeOut,
      }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:shadow-lg ${
        isFeatured
          ? "border-accent/30 bg-gradient-to-b from-surface to-accent/[0.03] ring-1 ring-accent/10"
          : "border-border bg-gradient-to-b from-surface to-muted/20"
      }`}
    >
      {/* Badge */}
      <div className="absolute -top-3 left-6">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.1 }}
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            isFeatured ? "bg-accent text-white shadow-md" : "bg-muted text-muted-foreground"
          }`}
        >
          {isFeatured ? "Mais Popular" : plan.name}
        </motion.span>
      </div>

      {/* Plan Name & Description */}
      <div className="mb-6 pt-2">
        {!isFeatured && <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{plan.name}</h3>}
        {isFeatured && <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">{plan.name}</h3>}
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold tracking-tight text-foreground">
            {price}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{suffix}</p>
      </div>

      {/* CTA Button */}
      <Link
        href={plan.ctaHref}
        className={`mb-6 inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-all active:scale-[0.98] ${
          isFeatured
            ? "bg-accent text-white shadow-md hover:bg-accent-strong hover:shadow-lg"
            : "border border-border bg-surface text-foreground hover:border-accent/30 hover:bg-accent/[0.02]"
        }`}
      >
        {plan.ctaLabel}
      </Link>

      {/* Features */}
      <ul className="mt-auto space-y-3">
        {plan.features.map((feature, featureIndex) => (
          <motion.li
            key={feature}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 + featureIndex * 0.05 }}
            className="flex items-start gap-3 text-sm text-muted-foreground"
          >
            <CheckIcon />
            <span>{feature}</span>
          </motion.li>
        ))}
      </ul>
    </motion.article>
  );
}

export function PricingToggle() {
  return (
    <div className="space-y-8">
      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {pricingPlans.map((plan, index) => (
          <PricingCard key={plan.name} plan={plan} index={index} />
        ))}
      </div>
    </div>
  );
}
