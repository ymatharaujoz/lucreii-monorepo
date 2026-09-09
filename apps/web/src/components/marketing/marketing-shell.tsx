"use client";

import Link from "next/link";
import { Instagram, Linkedin, UserRound, Youtube } from "lucide-react";
import { BrandLogoLight } from "@/components/brand-logo-light";
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

function MarketingBrandName({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-[#071326]">Lucre</span>
      <span className="text-[#0e7a6f]">ii</span>
    </span>
  );
}

export function MarketingShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="marketing-site relative min-h-screen bg-[#dff7f3]"
      lang="pt-BR"
    >
      <MarketingBackdrop />

      <div className="relative z-10">
        {/* Header */}
        <header className="relative z-50 px-4 pt-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <nav className="flex items-center justify-between rounded-[25px] border border-white/90 bg-white/95 px-4 py-2 shadow-[0_10px_30px_rgba(18,67,61,0.08)] backdrop-blur-xl md:px-7">
              {/* Logo */}
              <Link
                href="/"
                className="group flex shrink-0 items-center gap-2.5"
              >
                <BrandLogoLight className="h-10 w-10 transition-transform group-hover:scale-105" />
                <MarketingBrandName className="text-xl font-bold tracking-tight" />
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

        {children}

        <footer className="border-t border-[#dcebe9] bg-[#f7fbfa]/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[1400px] px-5 py-9 sm:px-8 lg:px-10 lg:py-10">
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-[330px_153px_158px_194px_minmax(0,1fr)] xl:gap-x-[45px]">
              <div>
                <Link href="/" className="inline-flex items-start gap-3">
                  <BrandLogoLight className="h-12 w-12 shrink-0" />
                  <span className="flex flex-col">
                    <MarketingBrandName className="text-2xl font-bold leading-none tracking-tight" />
                    <span className="mt-2 text-xs text-muted-foreground">
                      Clareza para vender com lucro.
                    </span>
                  </span>
                </Link>
              </div>

              {footerColumns.map(({ title, links }) => (
                <div key={title}>
                  <h2 className="text-sm font-bold text-foreground">{title}</h2>
                  <nav
                    className="mt-4 flex flex-col items-start gap-2.5"
                    aria-label={title}
                  >
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
                        <span
                          key={link.label}
                          className="text-sm text-muted-foreground"
                        >
                          {link.label}
                        </span>
                      ),
                    )}
                  </nav>
                </div>
              ))}

              <div className="md:border-l md:border-[#dcebe9] md:pl-7 xl:pl-8">
                <h2 className="text-sm font-bold text-foreground">
                  Acompanhe a Lucreii
                </h2>
                <div className="mt-4 flex items-center gap-3">
                  {socialLinks.map(({ label, icon: Icon }) => (
                    <span
                      key={label}
                      role="img"
                      aria-label={label}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dce8e7] bg-[#edf4f3] text-[#647874]"
                    >
                      <Icon
                        className="h-[18px] w-[18px]"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-[#dcebe9] pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                &copy; {new Date().getFullYear()} Lucreii. Todos os direitos
                reservados.
              </p>
              <p>Mais que dados. Decisões melhores.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
