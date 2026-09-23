import { readMigrationDatabaseUrl, readRuntimeDatabaseUrl } from "./database-url";
import { createPostgresConnection } from "./connection";
import { APPLICATION_TABLE_NAMES } from "./hardening-config";
import { loadRepoEnv } from "./load-repo-env";

const SUPABASE_ROLE_NAMES = ["anon", "authenticated"] as const;

type RoleCapability = {
  databaseName: string;
  roleName: string;
  roleBypassesRls: boolean;
  roleIsSuperuser: boolean;
};

type NamedRow = {
  name: string;
};

function assertBackupConfirmation(source: Record<string, string | undefined> = process.env) {
  if (source.DATABASE_HARDENING_BACKUP_CONFIRMED !== "true") {
    throw new Error(
      "DATABASE_HARDENING_BACKUP_CONFIRMED=true is required after verifying Supabase backup/PITR.",
    );
  }
}

function assertSupabaseConnectionUrl(label: string, value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL connection URL.`);
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${label} must use the PostgreSQL protocol.`);
  }

  if (!url.hostname.endsWith(".supabase.co")) {
    throw new Error(`${label} must target a Supabase PostgreSQL host.`);
  }
}

async function readRoleCapability(
  label: string,
  connectionString: string,
): Promise<RoleCapability> {
  const sql = createPostgresConnection(connectionString, { max: 1 });

  try {
    const rows = await sql<RoleCapability[]>`
      SELECT
        current_database() AS "databaseName",
        current_user AS "roleName",
        r.rolbypassrls AS "roleBypassesRls",
        r.rolsuper AS "roleIsSuperuser"
      FROM pg_roles AS r
      WHERE r.rolname = current_user
    `;
    const role = rows[0];

    if (!role) {
      throw new Error(`${label} could not resolve the active PostgreSQL role.`);
    }

    if (!role.roleBypassesRls && !role.roleIsSuperuser) {
      throw new Error(
        `${label} role ${role.roleName} requires BYPASSRLS or superuser privileges before FORCE ROW LEVEL SECURITY is deployed.`,
      );
    }

    return role;
  } finally {
    await sql.end({ timeout: 10 });
  }
}

async function verifySchema(connectionString: string) {
  const sql = createPostgresConnection(connectionString, { max: 1 });

  try {
    const [tables, roles] = await Promise.all([
      sql<NamedRow[]>`
        SELECT c.relname AS name
        FROM pg_class AS c
        INNER JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND c.relname = ANY(${APPLICATION_TABLE_NAMES})
      `,
      sql<NamedRow[]>`
        SELECT rolname AS name
        FROM pg_roles
        WHERE rolname = ANY(${SUPABASE_ROLE_NAMES})
      `,
    ]);

    const presentTables = new Set(tables.map((row) => row.name));
    const missingTables = APPLICATION_TABLE_NAMES.filter((name) => !presentTables.has(name));
    if (missingTables.length > 0) {
      throw new Error(
        `The database is missing application tables required by migration 0031: ${missingTables.join(", ")}.`,
      );
    }

    const presentRoles = new Set(roles.map((row) => row.name));
    const missingRoles = SUPABASE_ROLE_NAMES.filter((name) => !presentRoles.has(name));
    if (missingRoles.length > 0) {
      throw new Error(
        `The database is missing Supabase roles required for direct-access revocation: ${missingRoles.join(", ")}.`,
      );
    }
  } finally {
    await sql.end({ timeout: 10 });
  }
}

async function run() {
  assertBackupConfirmation();

  const runtimeConnectionString = readRuntimeDatabaseUrl();
  const migrationConnectionString = readMigrationDatabaseUrl();
  assertSupabaseConnectionUrl("DATABASE_URL", runtimeConnectionString);
  assertSupabaseConnectionUrl("DATABASE_MIGRATION_URL", migrationConnectionString);

  const [runtimeRole, migrationRole] = await Promise.all([
    readRoleCapability("DATABASE_URL", runtimeConnectionString),
    readRoleCapability("DATABASE_MIGRATION_URL", migrationConnectionString),
    verifySchema(migrationConnectionString),
  ]);

  console.info("[database] Hardening preflight passed.", {
    migrationDatabase: migrationRole.databaseName,
    migrationRole: migrationRole.roleName,
    runtimeDatabase: runtimeRole.databaseName,
    runtimeRole: runtimeRole.roleName,
  });
}

loadRepoEnv(import.meta.url);

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
