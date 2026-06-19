"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@lucreii/ui";
import { ApiClientError } from "@/lib/api/client";
import { createCompanyAndSelect } from "@/lib/company-creation";
import { CompanySetupCard } from "@/modules/onboarding";
import { containerVariants, fadeInVariants, itemVariants } from "@/lib/animations";
import Link from "next/link";

type CompanyCreationPanelProps = {
  companyCount: number;
  companyLimit: number;
  organizationName: string;
};

export function CompanyCreationPanel({
  companyCount,
  companyLimit,
  organizationName,
}: CompanyCreationPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: { cnpj: string; isActive: true; razaoSocial: string }) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await createCompanyAndSelect(data);
      router.replace("/app");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Nao foi possivel cadastrar a empresa. Tente novamente.",
      );
      setIsSubmitting(false);
    }
  }

  const isAtLimit = companyCount >= companyLimit;

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-8 pt-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeInVariants} initial="hidden" animate="visible" className="space-y-4">
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Voltar ao painel
          </Link>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Adicionar empresa
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Cadastre um novo CNPJ para a organização {organizationName}. Ao concluir, a nova empresa passa a ser a empresa ativa da sessão.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-stretch">
        <CompanySetupCard
          description="Cadastre mais um CNPJ para esta organização e use a nova empresa imediatamente nas integrações e filtros."
          isSubmitting={isSubmitting}
          message={message}
          onSubmit={handleSubmit}
          organizationName={organizationName}
          submitLabel="Adicionar empresa"
          submitLoadingLabel="Salvando empresa..."
          title="Adicionar empresa"
        />

        <motion.div variants={itemVariants} className="h-full min-h-0">
          <Card className="flex h-full min-h-0 flex-col overflow-hidden border-border/60">
            <div className="shrink-0 border-b border-border bg-surface-strong/30 px-6 py-4">
              <h3 className="font-semibold text-foreground">Resumo do cadastro</h3>
              <p className="text-xs text-muted-foreground">
                Informações sobre o seu plano e como funciona a adição de empresas.
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col divide-y divide-border">
              {/* Uso do plano */}
              <div className="flex items-start gap-4 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-foreground">Uso do plano</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {companyCount} de {companyLimit} empresas cadastradas
                  </p>
                </div>
              </div>

              {/* Regras */}
              <div className="flex min-h-0 flex-1 flex-col p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-foreground">Regras</h4>
                  </div>
                </div>
                <ul className="mt-3 space-y-2 pl-[52px] text-xs leading-relaxed text-muted-foreground">
                  <li>Cada empresa funciona de forma independente. Pedidos, produtos e relatórios ficam separados por CNPJ.</li>
                  <li>A nova empresa será selecionada automaticamente ao final do cadastro.</li>
                  <li>Se atingir o limite do plano, é só fazer um upgrade para adicionar mais empresas.</li>
                </ul>
              </div>

              {/* Alerta de limite */}
              <div
                className={`flex items-start gap-3 p-4 text-xs leading-relaxed ${
                  isAtLimit
                    ? "bg-amber-500/10 text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <ShieldAlert className={`mt-0.5 h-4 w-4 shrink-0 ${isAtLimit ? "text-amber-500" : "text-muted-foreground"}`} />
                <p>
                  {isAtLimit
                    ? "Você já atingiu o limite de empresas do seu plano. Para cadastrar uma nova, faça um upgrade primeiro."
                    : "Você ainda tem espaço para adicionar mais empresas no seu plano atual."}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
