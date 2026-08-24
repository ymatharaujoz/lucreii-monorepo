import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /auth/session-expired", () => {
  it("clears the mirrored session and redirects to sign-in", () => {
    const response = GET(
      new Request("https://app.lucreii.com/auth/session-expired"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBe(
      "https://app.lucreii.com/sign-in",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "lucreii.web_session=;",
    );
  });
});
