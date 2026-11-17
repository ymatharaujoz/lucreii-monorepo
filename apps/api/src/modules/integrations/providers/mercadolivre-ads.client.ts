import { IntegrationProviderError } from "../integrations.types";

const MERCADOLIVRE_API_BASE_URL = "https://api.mercadolibre.com";
const AD_GROUPS_PAGE_SIZE = 500;
/** Mercado Livre rejects searches where `offset + limit` exceeds 10.000. */
const AD_GROUPS_MAX_WINDOW = 10_000;
const MAX_RATE_LIMIT_RETRIES = 4;
const RATE_LIMIT_BASE_DELAY_MS = 1_000;

export type MercadoLivreAdvertiser = {
  advertiserId: string;
  siteId: string;
};

type AdvertisersResponse = {
  advertisers?: Array<{
    advertiser_id?: number | string | null;
    site_id?: string | null;
  }>;
};

type AdGroupSearchResponse = {
  paging?: { limit?: number; offset?: number; total?: number };
  results?: Array<{
    ad_group_external_id?: number | string | null;
    metrics?: { cost?: number | string | null } | null;
  }>;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCents(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value;

  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed * 100)
    : 0;
}

async function readErrorDetail(response: Response) {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * Read-only client for the Mercado Livre Product Ads API (ad group flow,
 * which replaced the per-item ads endpoints shut down in May 2026).
 *
 * Ad groups are keyed by `ad_group_external_id`: the item id for traditional
 * listings, the family id for User Products and the parent item id for
 * catalog listings.
 */
export class MercadoLivreAdsClient {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  /**
   * Resolves the Product Ads advertiser of the authenticated seller. Returns
   * `null` when the seller never enabled Product Ads (Mercado Livre answers
   * 404 "No permissions found for user_id").
   */
  async findProductAdsAdvertiser(
    accessToken: string,
    preferredSiteId = "MLB",
  ): Promise<MercadoLivreAdvertiser | null> {
    const url = new URL(`${MERCADOLIVRE_API_BASE_URL}/advertising/advertisers`);
    url.searchParams.set("product_id", "PADS");

    const response = await this.request(url, accessToken, "1");

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new IntegrationProviderError(
        `Mercado Livre advertiser lookup failed (HTTP ${response.status}). ${await readErrorDetail(response)}`.trim(),
        "remote_request_failed",
      );
    }

    const payload = (await response.json()) as AdvertisersResponse;
    const advertisers = (payload.advertisers ?? [])
      .map((advertiser) => ({
        advertiserId:
          advertiser.advertiser_id === null ||
          advertiser.advertiser_id === undefined
            ? ""
            : String(advertiser.advertiser_id).trim(),
        siteId: advertiser.site_id?.trim().toUpperCase() ?? "",
      }))
      .filter((advertiser) => advertiser.advertiserId && advertiser.siteId);

    return (
      advertisers.find((advertiser) => advertiser.siteId === preferredSiteId) ??
      advertisers[0] ??
      null
    );
  }

  /**
   * Sums the advertising cost of every ad group of the advertiser within the
   * date range, keyed by `ad_group_external_id`. Amounts are integer cents.
   */
  async listAdGroupCostsInCents(input: {
    accessToken: string;
    advertiser: MercadoLivreAdvertiser;
    dateFrom: string;
    dateTo: string;
  }): Promise<Map<string, number>> {
    const costs = new Map<string, number>();
    let offset = 0;

    for (;;) {
      const url = new URL(
        `${MERCADOLIVRE_API_BASE_URL}/advertising/${encodeURIComponent(input.advertiser.siteId)}/advertisers/${encodeURIComponent(input.advertiser.advertiserId)}/product_ads/ad_groups/search`,
      );
      url.searchParams.set("date_from", input.dateFrom);
      url.searchParams.set("date_to", input.dateTo);
      url.searchParams.set("metrics", "COST");
      url.searchParams.set("limit", String(AD_GROUPS_PAGE_SIZE));
      url.searchParams.set("offset", String(offset));

      const response = await this.request(url, input.accessToken, "2");

      if (!response.ok) {
        throw new IntegrationProviderError(
          `Mercado Livre ad group metrics lookup failed (HTTP ${response.status}). ${await readErrorDetail(response)}`.trim(),
          "remote_request_failed",
        );
      }

      const payload = (await response.json()) as AdGroupSearchResponse;
      const results = payload.results ?? [];

      for (const result of results) {
        const externalId =
          result.ad_group_external_id === null ||
          result.ad_group_external_id === undefined
            ? ""
            : String(result.ad_group_external_id).trim();
        const cents = toCents(result.metrics?.cost);

        // Zero-cost ad groups are kept: they are Mercado Livre data too and
        // must overwrite a stale amount for the listing.
        if (!externalId) {
          continue;
        }

        costs.set(externalId, (costs.get(externalId) ?? 0) + cents);
      }

      offset += results.length;
      const total = payload.paging?.total ?? offset;

      if (
        results.length === 0 ||
        offset >= total ||
        offset + AD_GROUPS_PAGE_SIZE > AD_GROUPS_MAX_WINDOW
      ) {
        break;
      }
    }

    return costs;
  }

  private async request(url: URL, accessToken: string, apiVersion: string) {
    for (let attempt = 0; ; attempt += 1) {
      const response = await this.fetchImpl(url, {
        headers: {
          "api-version": apiVersion,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
        return response;
      }

      await sleep(RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt);
    }
  }
}
