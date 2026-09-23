import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { APPLICATION_TABLE_NAMES, ONLINE_INDEXES } from "./hardening-config";

describe("database hardening configuration", () => {
  it("keeps a unique, explicit manifest of every application table", () => {
    expect(new Set(APPLICATION_TABLE_NAMES).size).toBe(APPLICATION_TABLE_NAMES.length);
    expect(APPLICATION_TABLE_NAMES).toContain("user");
    expect(APPLICATION_TABLE_NAMES).toContain("verification");
  });

  it("targets only application tables with unique online index names", () => {
    expect(new Set(ONLINE_INDEXES.map((index) => index.name)).size).toBe(
      ONLINE_INDEXES.length,
    );

    for (const index of ONLINE_INDEXES) {
      expect(APPLICATION_TABLE_NAMES).toContain(index.tableName);
      expect(index.statement).toContain("CREATE INDEX CONCURRENTLY IF NOT EXISTS");
    }
  });

  it("keeps the backend-only RLS migration scoped to the table manifest", () => {
    const migration = readFileSync(
      path.resolve(__dirname, "../drizzle/0031_backend_only_rls.sql"),
      "utf8",
    );

    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).not.toContain("CREATE POLICY");
    expect(migration).not.toContain("auth.uid()");

    for (const tableName of APPLICATION_TABLE_NAMES) {
      expect(migration).toContain(`'${tableName}'`);
    }
  });
});
