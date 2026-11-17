import { describe, expect, it, vi } from "vitest";
import { IntegrationProviderError } from "../integrations.types";
import { MercadoLivreAdsClient } from "./mercadolivre-ads.client";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("MercadoLivreAdsClient", () => {
  it("picks the MLB Product Ads advertiser", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        advertisers: [
          { advertiser_id: 111, site_id: "MLA" },
          { advertiser_id: 222, site_id: "MLB" },
        ],
      }),
    );
    const client = new MercadoLivreAdsClient(fetchImpl);

    await expect(client.findProductAdsAdvertiser("token")).resolves.toEqual({
      advertiserId: "222",
      siteId: "MLB",
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.mercadolibre.com/advertising/advertisers?product_id=PADS",
    );
    expect(init.headers).toMatchObject({
      Authorization: "Bearer token",
      "api-version": "1",
    });
  });

  it("returns null when the seller has no Product Ads permission", async () => {
    const client = new MercadoLivreAdsClient(
      vi.fn().mockResolvedValue(jsonResponse({ message: "No permissions found" }, 404)),
    );

    await expect(client.findProductAdsAdvertiser("token")).resolves.toBeNull();
  });

  it("paginates ad groups and sums cost in cents by external id", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          paging: { limit: 500, offset: 0, total: 3 },
          results: [
            { ad_group_external_id: "MLB1", metrics: { cost: 10.5 } },
            { ad_group_external_id: 987654321, metrics: { cost: 0 } },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          paging: { limit: 500, offset: 2, total: 3 },
          results: [{ ad_group_external_id: "MLB1", metrics: { cost: 1.25 } }],
        }),
      );
    const client = new MercadoLivreAdsClient(fetchImpl);

    const costs = await client.listAdGroupCostsInCents({
      accessToken: "token",
      advertiser: { advertiserId: "42", siteId: "MLB" },
      dateFrom: "2026-11-01",
      dateTo: "2026-11-17",
    });

    expect(costs).toEqual(
      new Map([
        ["MLB1", 1_175],
        ["987654321", 0],
      ]),
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const firstUrl = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(firstUrl.pathname).toBe(
      "/advertising/MLB/advertisers/42/product_ads/ad_groups/search",
    );
    expect(firstUrl.searchParams.get("date_from")).toBe("2026-11-01");
    expect(firstUrl.searchParams.get("date_to")).toBe("2026-11-17");
    expect(firstUrl.searchParams.get("metrics")).toBe("COST");
    expect(new URL(String(fetchImpl.mock.calls[1][0])).searchParams.get("offset")).toBe("2");
  });

  it("raises a provider error when the metrics request fails", async () => {
    const client = new MercadoLivreAdsClient(
      vi.fn().mockResolvedValue(jsonResponse({ message: "forbidden" }, 403)),
    );

    await expect(
      client.listAdGroupCostsInCents({
        accessToken: "token",
        advertiser: { advertiserId: "42", siteId: "MLB" },
        dateFrom: "2026-11-01",
        dateTo: "2026-11-17",
      }),
    ).rejects.toBeInstanceOf(IntegrationProviderError);
  });
});
