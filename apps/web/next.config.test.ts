import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

describe("next.config", () => {
  it("does not add a Vercel rewrite for API auth flow", async () => {
    expect(nextConfig.rewrites).toBeUndefined();
  });
});
