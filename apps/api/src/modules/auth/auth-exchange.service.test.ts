import { describe, expect, it, vi } from "vitest";
import { authExchangeTickets } from "@marginflow/database";
import { AuthExchangeService } from "./auth-exchange.service";

function createService() {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  const db = {
    insert: vi.fn((table: unknown) => {
      if (table !== authExchangeTickets) {
        throw new Error("Unexpected insert target.");
      }

      return {
        values: insertValues,
      };
    }),
    query: {
      authExchangeTickets: {
        findFirst: vi.fn(),
      },
    },
    transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db)),
    update: vi.fn((table: unknown) => {
      if (table !== authExchangeTickets) {
        throw new Error("Unexpected update target.");
      }

      return {
        set: updateSet,
      };
    }),
  };
  const authService = {
    resolveRequestContext: vi.fn(),
  };

  return {
    authService,
    db,
    insertValues,
    service: new AuthExchangeService(db as never, authService as never),
    updateSet,
  };
}

describe("AuthExchangeService", () => {
  it("creates one-time exchange tickets for authenticated Better Auth sessions", async () => {
    const { insertValues, service } = createService();

    const ticket = await service.createTicket({
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
    });

    expect(ticket).toMatch(/[A-Za-z0-9_-]{20,}/);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteSessionToken: "remote_session_token_123",
        sessionId: "session_123",
        userId: "user_123",
      }),
    );
  });

  it("consumes valid ticket once and returns mirrored auth payload", async () => {
    const { authService, db, service } = createService();
    db.query.authExchangeTickets.findFirst.mockResolvedValue({
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      id: "exchange_123",
      remoteSessionToken: "remote_session_token_123",
      usedAt: null,
    });
    authService.resolveRequestContext.mockResolvedValue({
      organization: {
        id: "org_123",
        name: "MarginFlow",
        role: "owner",
        slug: "marginflow",
      },
      session: {
        expiresAt: new Date("2026-12-31T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });

    const ticket = await service.createTicket({
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
    });

    const payload = await service.consumeTicket(ticket);

    expect(authService.resolveRequestContext).toHaveBeenCalled();
    expect(payload).toEqual({
      authState: {
        onboardingStatus: "complete",
        organization: {
          id: "org_123",
          name: "MarginFlow",
          role: "owner",
          slug: "marginflow",
        },
        session: {
          expiresAt: "2026-12-31T00:00:00.000Z",
          id: "session_123",
        },
        user: {
          email: "owner@marginflow.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
      remoteSessionToken: "remote_session_token_123",
    });
  });
});
