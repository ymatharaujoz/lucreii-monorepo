import { describe, expect, it } from "vitest";
import { buildAuthCompleteRedirectUrl } from "./better-auth-http";

describe("buildAuthCompleteRedirectUrl", () => {
  it("rewrites successful callback redirects to the Vercel auth completion route", () => {
    expect(
      buildAuthCompleteRedirectUrl({
        callbackLocation: "https://marginflow-web.vercel.app/app",
        ticket: "ticket_123",
        webAppOrigin: "https://marginflow-web.vercel.app",
      }),
    ).toBe(
      "https://marginflow-web.vercel.app/auth/complete?ticket=ticket_123&next=%2Fapp",
    );
  });
});
