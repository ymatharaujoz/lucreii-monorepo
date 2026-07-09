import { describe, expect, it } from "vitest";
import { appVersionApiResponseSchema, appVersionSchema } from "./app-version";

describe("@lucreii/validation app version schema", () => {
  it("accepts semver strings", () => {
    expect(appVersionSchema.parse("1.0.0")).toBe("1.0.0");
  });

  it("accepts version payloads", () => {
    const result = appVersionApiResponseSchema.safeParse({
      data: {
        version: "1.0.0",
      },
      error: null,
    });

    expect(result.success).toBe(true);
  });
});
