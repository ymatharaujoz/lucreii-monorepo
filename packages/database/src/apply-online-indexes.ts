import { createPostgresConnection } from "./connection";
import { readMigrationDatabaseUrl } from "./database-url";
import { ONLINE_INDEXES, type OnlineIndexDefinition } from "./hardening-config";
import { loadRepoEnv } from "./load-repo-env";

type IndexValidityRow = {
  isValid: boolean;
};

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function readIndexValidity(
  sql: ReturnType<typeof createPostgresConnection>,
  indexName: string,
) {
  const rows = await sql<IndexValidityRow[]>`
    SELECT i.indisvalid AS "isValid"
    FROM pg_class AS c
    INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
    INNER JOIN pg_index AS i ON i.indexrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relname = ${indexName}
  `;

  return rows[0]?.isValid ?? null;
}

async function dropInvalidIndex(
  sql: ReturnType<typeof createPostgresConnection>,
  indexName: string,
) {
  if ((await readIndexValidity(sql, indexName)) === false) {
    await sql.unsafe(`DROP INDEX CONCURRENTLY IF EXISTS public.${quoteIdentifier(indexName)}`);
  }
}

async function rollbackCreatedIndexes(
  sql: ReturnType<typeof createPostgresConnection>,
  createdIndexes: OnlineIndexDefinition[],
) {
  const failures: string[] = [];

  for (const index of [...createdIndexes].reverse()) {
    try {
      await sql.unsafe(`DROP INDEX CONCURRENTLY IF EXISTS public.${quoteIdentifier(index.name)}`);
    } catch (error) {
      failures.push(
        `${index.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(`Could not roll back online indexes: ${failures.join("; ")}`);
  }
}

async function run() {
  const sql = createPostgresConnection(readMigrationDatabaseUrl(), { max: 1 });
  const createdIndexes: OnlineIndexDefinition[] = [];

  try {
    await sql`SET lock_timeout = '5s'`;
    await sql`SET statement_timeout = '15min'`;
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

    for (const index of ONLINE_INDEXES) {
      const existingValidity = await readIndexValidity(sql, index.name);
      if (existingValidity === false) {
        await dropInvalidIndex(sql, index.name);
      }

      await sql.unsafe(index.statement);

      if (existingValidity !== true) {
        createdIndexes.push(index);
      }
      console.info("[database] Online index ready.", { index: index.name });
    }
  } catch (error) {
    const rollbackError = await rollbackCreatedIndexes(sql, createdIndexes).catch(
      (rollbackFailure: unknown) => rollbackFailure,
    );

    if (rollbackError instanceof Error) {
      throw new AggregateError(
        [error, rollbackError],
        "Online index creation failed and rollback was incomplete.",
      );
    }

    for (const index of ONLINE_INDEXES) {
      await dropInvalidIndex(sql, index.name);
    }
    throw error;
  } finally {
    await sql.end({ timeout: 10 });
  }
}

loadRepoEnv(import.meta.url);

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
