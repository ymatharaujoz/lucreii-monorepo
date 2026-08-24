import { describe, expect, it } from "vitest";
import { translateApiMessage } from "./api-ui";

describe("translateApiMessage", () => {
  it("translates Mercado Livre offline access guidance and preserves diagnostics", () => {
    expect(
      translateApiMessage(
        "Mercado Livre token exchange failed. The Mercado Livre app must grant offline_access to return refresh_token. Reauthorize the account. status=200 payload={...}",
      ),
    ).toBe(
      "Falha na troca de token do Mercado Livre. O app do Mercado Livre precisa conceder offline_access para retornar refresh_token. Autorize a conta novamente. status=200 payload={...}",
    );
  });
});
