import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const env = {
  API_DB_POOL_MAX: 5,
  API_HOST: "127.0.0.1",
  API_PORT: 4000,
  AUTH_TRUSTED_ORIGINS: undefined,
  API_PUBLIC_BASE_URL: "http://localhost:4000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/lucreii",
  MERCADOLIVRE_CLIENT_ID: undefined,
  MERCADOLIVRE_CLIENT_SECRET: undefined,
  MERCADOLIVRE_REDIRECT_URI: undefined,
  STRIPE_SECRET_KEY: "stripe",
  STRIPE_WEBHOOK_SECRET: "webhook",
  STRIPE_PRICE_START_MONTHLY: "price_start_monthly",
      STRIPE_PRICE_ESSENCIAL_MONTHLY: "price_essencial_monthly",
  STRIPE_PRICE_PRO_MONTHLY: "price_pro_monthly",
  STRIPE_PRICE_BUSINESS_MONTHLY: "price_business_monthly",
  NODE_ENV: "test",
  SYNC_RELAX_GUARDS: false,
  WEB_APP_ORIGIN: "http://localhost:3000",
} as const;

function createService({
  membership = {
    id: "org_123",
    name: "Existing Org",
    role: "owner",
    slug: "existing-org",
  },
  persistedSession,
}: {
  membership?: {
    id: string;
    name: string;
    role: string;
    slug: string;
  } | null;
  persistedSession?: {
    expiresAt: Date | string;
    id: string;
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      emailVerified: boolean;
    } | null;
  } | null;
} = {}) {
  const db = {
    query: {
      companies: {
        findFirst: vi.fn(),
      },
      sessions: {
        findFirst: vi.fn().mockResolvedValue(persistedSession ?? null),
      },
    },
  };
  const organizationProvisioningService = {
    findDefaultOrganization: vi.fn().mockResolvedValue(membership),
  };

  return {
    db,
    organizationProvisioningService,
    service: new AuthService(db as never, organizationProvisioningService as never),
  };
}

describe("AuthService", () => {
  it("creates the internal seven-day trial in the signup transaction", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const transaction = vi.fn(async (work: (tx: unknown) => Promise<void>) =>
      work({ insert: vi.fn(() => ({ values })) }),
    );
    const db = {
      query: {
        users: { findFirst: vi.fn().mockResolvedValue(null) },
      },
      transaction,
    };
    const service = new AuthService(
      db as never,
      { findDefaultOrganization: vi.fn() } as never,
    );
    const before = Date.now();

    await service.signUp(
      {
        email: " Owner@Lucreii.Local ",
        name: "Owner",
        password: "password123",
      },
      {},
    );

    const trialInsert = values.mock.calls
      .map(([input]) => input)
      .find((input) => "trialEndsAt" in input);
    expect(trialInsert).toMatchObject({
      email: "owner@lucreii.local",
      userId: expect.any(String),
    });
    expect(trialInsert.trialEndsAt.getTime() - trialInsert.trialStartedAt.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
    expect(trialInsert.trialStartedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("returns null when api session cookie is missing", async () => {
    const { db, service } = createService();

    const context = await service.resolveRequestContext({
      headers: new Headers(),
    });

    expect(db.query.sessions.findFirst).not.toHaveBeenCalled();
    expect(context).toBeNull();
  });

  it("hydrates auth context from persisted internal session", async () => {
    const { db, organizationProvisioningService, service } = createService({
      persistedSession: {
        expiresAt: "2099-04-22T00:00:00.000Z",
        id: "session_123",
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
    });

    const context = await service.resolveRequestContext({
      headers: new Headers({
        cookie: "lucreii_api_session=session_token_123",
      }),
    });

    expect(db.query.sessions.findFirst).toHaveBeenCalled();
    expect(organizationProvisioningService.findDefaultOrganization).toHaveBeenCalledWith(
      "user_123",
    );
    expect(db.query.companies.findFirst).not.toHaveBeenCalled();
    expect(context).toEqual({
      organization: {
        id: "org_123",
        name: "Existing Org",
        role: "owner",
        slug: "existing-org",
      },
      selectedCompanyId: null,
      session: {
        expiresAt: new Date("2099-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
  });

  it("keeps authenticated users without organization during onboarding gap", async () => {
    const { service } = createService({
      membership: null,
      persistedSession: {
        expiresAt: "2099-04-22T00:00:00.000Z",
        id: "session_123",
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
    });

    const context = await service.resolveRequestContext({
      headers: new Headers({
        cookie: "lucreii_api_session=session_token_123",
      }),
    });

    expect(context).toEqual({
      organization: null,
      selectedCompanyId: null,
      session: {
        expiresAt: new Date("2099-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@lucreii.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
  });

  it("hydrates selected company from the internal company header when the user has access", async () => {
    const { db, service } = createService({
      persistedSession: {
        expiresAt: "2099-04-22T00:00:00.000Z",
        id: "session_123",
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
    });
    db.query.companies.findFirst.mockResolvedValue({
      id: "company_123",
    });

    const context = await service.resolveRequestContext({
      headers: new Headers({
        cookie: "lucreii_api_session=session_token_123",
        "x-lucreii-company-id": " company_123 ",
      }),
    });

    expect(db.query.companies.findFirst).toHaveBeenCalled();
    expect(context?.selectedCompanyId).toBe("company_123");
  });

  it("ignores selected company header when the company is not accessible", async () => {
    const { db, service } = createService({
      persistedSession: {
        expiresAt: "2099-04-22T00:00:00.000Z",
        id: "session_123",
        user: {
          email: "owner@lucreii.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
    });
    db.query.companies.findFirst.mockResolvedValue(null);

    const context = await service.resolveRequestContext({
      headers: {
        cookie: "lucreii_api_session=session_token_123",
        "x-lucreii-company-id": "company_missing",
      },
    });

    expect(context?.selectedCompanyId).toBeNull();
  });
});
