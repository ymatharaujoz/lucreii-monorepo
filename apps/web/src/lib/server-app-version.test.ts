import { afterEach, describe, expect, it, vi } from "vitest";
import { readServerAppVersion } from "./server-app-version";

describe("readServerAppVersion", () => {
  const originalFetch = global.fetch;
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    global.fetch = originalFetch;

    if (originalApiBaseUrl) {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }

    vi.restoreAllMocks();
  });

  it("parses the app version payload", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000";
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              version: "1.0.0",
            },
            error: null,
          }),
          {
            headers: {
              "content-type": "application/json",
            },
            status: 200,
          },
        ),
    ) as typeof fetch;

    await expect(readServerAppVersion()).resolves.toBe("1.0.0");
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:4000/health/version", {
      cache: "no-store",
    });
  });
});
