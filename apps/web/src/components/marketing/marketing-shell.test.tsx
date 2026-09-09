/** @vitest-environment jsdom */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MarketingShell } from "./marketing-shell";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("framer-motion", () => {
  const motionElement = (tag: string) => {
    const element = Object.assign(
      ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
        const domProps = Object.fromEntries(
          Object.entries(props).filter(
            ([key]) => !["animate", "initial", "transition"].includes(key),
          ),
        );
        return React.createElement(tag, domProps, children);
      },
      { displayName: `Motion${tag}` },
    );

    return element;
  };

  return {
    motion: { div: motionElement("div") },
  };
});

describe("MarketingShell header", () => {
  it("renders the reference lockup, access CTA, and centered navigation", () => {
    const markup = renderToStaticMarkup(
      <MarketingShell>
        <div>Conteúdo</div>
      </MarketingShell>,
    );

    expect(markup).toContain('href="/sign-in"');
    expect(markup).toContain("Acessar");
    expect(markup).toContain('href="#recursos"');
    expect(markup).toContain('href="#integracoes"');
    expect(markup).toContain('href="#como-funciona"');
    expect(markup).toContain("Como funciona");
    expect(markup).toContain('href="#planos"');
    expect(markup).not.toContain("Alternar tema");
  });
});
