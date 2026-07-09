import { appVersionApiResponseSchema } from "@lucreii/validation";
import { getWebEnv } from "@/lib/env";
import { parseApiContract } from "@/lib/api/contract";

export async function readServerAppVersion(): Promise<string> {
  const endpoint = `${getWebEnv().NEXT_PUBLIC_API_BASE_URL}/health/version`;

  const response = await fetch(endpoint, {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Version request failed with status ${response.status}.${errorBody ? ` ${errorBody}` : ""}`,
    );
  }

  const payload = await response.json();

  return parseApiContract("/health/version", payload, appVersionApiResponseSchema).data.version;
}
