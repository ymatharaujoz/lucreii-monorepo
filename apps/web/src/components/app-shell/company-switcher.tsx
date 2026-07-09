"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Building, Building2, Check, ChevronUp, Plus, Sparkles } from "lucide-react";
import type { Company } from "@lucreii/types";
import { Avatar } from "@lucreii/ui";

type CompanySwitcherProps = {
  companies: Company[];
  collapsed: boolean;
  organizationName: string;
  planLimit: number;
  user: {
    image: string | null;
    name: string;
  };
};

function cn(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

function normalizeCompanyCount(companies: Company[]) {
  return companies.filter((company) => company.isActive).length;
}

function formatCNPJ(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return raw;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function formatShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts.at(-1)}`;
}

async function selectCompany(companyId: string) {
  const response = await fetch("/auth/select-company", {
    body: JSON.stringify({ companyId }),
    headers: {
      "content-type": "application/json",
    },
    method: "PATCH",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Nao foi possivel selecionar a empresa.");
  }
}

export function CompanySwitcher({
  collapsed,
  companies,
  organizationName,
  planLimit,
  user,
}: CompanySwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCompanies = companies.filter((company) => company.isActive);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);
  const selectedCompany =
    companies.find((company) => company.isSelected && company.isActive) ??
    activeCompanies[0] ??
    companies[0] ??
    null;
  const companyCount = normalizeCompanyCount(companies);

  function handleSelect(companyId: string) {
    startTransition(() => {
      void selectCompany(companyId)
        .then(() => {
          setIsOpen(false);
          router.refresh();
        })
        .catch(() => {
          setIsOpen(false);
        });
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        className={cn(
          "flex w-full items-center rounded-2xl border border-border bg-background py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-strong",
          collapsed ? "justify-center px-2" : "gap-3 px-3"
        )}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <div className="relative shrink-0">
          <Avatar
            alt={user.name}
            fallback={user.name}
            size="sm"
            src={user.image || undefined}
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
        </div>

        {!collapsed ? (
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-[13px] font-medium text-foreground">{formatShortName(user.name)}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {selectedCompany?.razaoSocial ?? organizationName}
            </p>
          </div>
        ) : null}

        {!collapsed && (
          <ChevronUp
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={{ opacity: 1, x: 0, y: 0 }}
            className={cn(
              "absolute z-20 rounded-2xl border border-border-strong/60 bg-surface-elevated p-4 shadow-[0_24px_48px_-16px_rgba(15,23,42,0.28)]",
              collapsed
                ? "left-full bottom-0 ml-2 w-[360px]"
                : "bottom-full left-0 right-0 mb-3 min-w-[360px]"
            )}
            exit={{ opacity: 0, x: collapsed ? -4 : 0, y: collapsed ? 0 : 8 }}
            initial={{ opacity: 0, x: collapsed ? -4 : 0, y: collapsed ? 0 : 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 shrink-0 text-accent" />
                <div className="flex flex-col leading-none">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Empresas
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums leading-none text-muted-foreground">
                    {companyCount} de {planLimit} CNPJs
                  </p>
                </div>
              </div>
              {companyCount >= planLimit ? (
                <Link
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-[11px] font-semibold text-warning transition-all duration-200 hover:bg-warning/15"
                  href="/app/billing"
                  onClick={() => setIsOpen(false)}
                >
                  <Sparkles className="h-3 w-3" />
                  Faça upgrade
                </Link>
              ) : (
                <Link
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-all duration-200 hover:border-accent/30 hover:bg-accent/5 hover:text-accent"
                  href="/app/companies/new"
                  onClick={() => setIsOpen(false)}
                >
                  <Plus className="h-3 w-3 transition-transform duration-200 group-hover:rotate-90" />
                  Adicionar empresa
                </Link>
              )}
            </div>

            <div className="mt-3 space-y-1.5">
              {companies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
                  Nenhuma empresa cadastrada.
                </div>
              ) : (
                companies.map((company, index) => {
                  const isSelected = company.isActive && company.id === selectedCompany?.id;

                  return (
                    <motion.button
                      key={company.id}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 ${
                        isSelected
                          ? "border border-accent/20 bg-gradient-to-r from-accent/[0.08] to-accent/[0.03] text-foreground shadow-sm"
                          : "border border-transparent text-foreground hover:-translate-y-px hover:bg-background hover:shadow-sm"
                      }`}
                      disabled={isPending || isSelected}
                      initial={{ opacity: 0, y: 6 }}
                      onClick={() => handleSelect(company.id)}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      type="button"
                    >
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                          isSelected
                            ? "bg-accent/15 text-accent shadow-[0_0_12px_rgba(14,122,111,0.12)]"
                            : "bg-foreground/[0.04] text-muted-foreground group-hover:bg-foreground/[0.07]"
                        }`}
                      >
                        {isSelected ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug">
                          {company.razaoSocial}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                          CNPJ {formatCNPJ(company.cnpj)}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                          Atual
                        </span>
                      ) : null}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
