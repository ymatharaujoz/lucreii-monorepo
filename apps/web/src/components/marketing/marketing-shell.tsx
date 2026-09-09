"use client";

import Link from "next/link";
import { Instagram, Linkedin, UserRound, Youtube } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { BrandName } from "@/components/brand-name";
import { MarketingBackdrop } from "@/components/marketing/marketing-backdrop";
import { MarketingNavLinks } from "@/components/marketing/marketing-nav-links";

const footerColumns = [
  {
    title: "Produto",
    links: [
      { label: "Recursos", href: "#recursos" },
      { label: "Integrações", href: "#integracoes" },
      { label: "Planos", href: "#planos" },
    ],
  },
  {
    title: "Suporte",
    links: [
      { label: "Central de ajuda", href: "mailto:suporte@lucreii.com" },
      { label: "Fale conosco", href: "#demo" },
    ],
  },
  {
    title: "Legal",
    links: [{ label: "Termos de Uso" }, { label: "Política de Privacidade" }],
  },
] as const;

const socialLinks = [
  { label: "Instagram", icon: Instagram },
  { label: "YouTube", icon: Youtube },
  { label: "LinkedIn", icon: Linkedin },
] as const;

export function MarketingShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="marketing-site relative min-h-screen" lang="pt-BR">
      <MarketingBackdrop />

      <div className="relative z-10">
        {/* Header */}
        <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <nav className="flex items-center justify-between rounded-[24px] border border-white/80 bg-white/90 px-4 py-2 shadow-[0_10px_30px_rgba(18,67,61,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-surface/90 md:px-6">
              {/* Logo */}
              <Link
                href="/"
                className="group flex shrink-0 items-center gap-2.5"
              >
                <BrandLogo className="h-10 w-10 transition-transform group-hover:scale-105" />
                <BrandName className="text-xl font-bold tracking-tight" />
              </Link>

              {/* Navigation */}
              <div className="hidden flex-1 items-center justify-center gap-1 md:flex">
                <MarketingNavLinks linkClassName="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/5 hover:text-foreground" />
              </div>

              {/* CTA Button */}
              <div className="ml-auto flex items-center">
                <Link
                  href="/sign-in"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-strong hover:shadow-md active:scale-[0.98]"
                >
                  <UserRound
                    className="h-4 w-4"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  Acessar
                </Link>
              </div>
            </nav>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-20" />

        {children}

        <footer className="border-t border-[#dcebe9] bg-[#f7fbfa]/95 backdrop-blur-sm dark:border-white/10 dark:bg-surface/95">
          <div className="mx-auto max-w-[1400px] px-5 py-9 sm:px-8 lg:px-10 lg:py-10">
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-[330px_153px_158px_194px_minmax(0,1fr)] xl:gap-x-[45px]">
              <div>
                <Link href="/" className="inline-flex items-start gap-3">
                  <BrandLogo className="h-12 w-12 shrink-0" />
                  <span className="flex flex-col">
                    <BrandName className="text-2xl font-bold leading-none tracking-tight" />
                    <span className="mt-2 text-xs text-muted-foreground">
                      Clareza para vender com lucro.
                    </span>
                  </span>
                </Link>
              </div>

              {footerColumns.map(({ title, links }) => (
                <div key={title}>
                  <h2 className="text-sm font-bold text-foreground">{title}</h2>
                  <nav className="mt-4 flex flex-col items-start gap-2.5" aria-label={title}>
                    {links.map((link) =>
                      "href" in link ? (
                        <Link
                          key={link.label}
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-accent"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <span key={link.label} className="text-sm text-muted-foreground">
                          {link.label}
                        </span>
                      ),
                    )}
                  </nav>
                </div>
              ))}

              <div className="md:border-l md:border-[#dcebe9] md:pl-7 dark:md:border-white/10 xl:pl-8">
                <h2 className="text-sm font-bold text-foreground">Acompanhe a Lucreii</h2>
                <div className="mt-4 flex items-center gap-3">
                  {socialLinks.map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      role="img"
                      aria-label={label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce8e7] bg-[#edf4f3] text-[#647874] dark:border-white/10 dark:bg-white/10 dark:text-foreground-soft"
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-[#dcebe9] pt-5 text-xs text-muted-foreground dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <p>&copy; {new Date().getFullYear()} Lucreii. Todos os direitos reservados.</p>
              <p>Mais que dados. Decisões melhores.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
