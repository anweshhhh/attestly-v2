import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const migrationsRoot = path.join(projectRoot, "prisma", "postgres-migrations");
const migrationTable = "_attestly_sql_migrations";

function getMigrationDatabaseUrl() {
  const directUrl = process.env.DIRECT_DATABASE_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const connectionString = directUrl || databaseUrl;

  if (!connectionString) {
    throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
  }

  if (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://")) {
    throw new Error("Postgres migrations require a postgres:// or postgresql:// connection string.");
  }

  return connectionString;
}

async function listMigrationFiles() {
  const entries = await fs.readdir(migrationsRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      filePath: path.join(migrationsRoot, entry.name, "migration.sql")
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function readMigrationSql(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Could not read migration file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checksumMigration(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${migrationTable}" (
      "name" TEXT PRIMARY KEY,
      "checksum" TEXT NOT NULL,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function applyMigration(client, migration) {
  const sql = await readMigrationSql(migration.filePath);
  const checksum = checksumMigration(sql);

  const existing = await client.query(
    `SELECT "checksum" FROM "${migrationTable}" WHERE "name" = $1 LIMIT 1`,
    [migration.name]
  );

  if (existing.rowCount) {
    if (existing.rows[0].checksum !== checksum) {
      throw new Error(
        `Migration ${migration.name} was already applied with a different checksum. Refuse to continue.`
      );
    }

    return false;
  }

  await client.query("BEGIN");

  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO "${migrationTable}" ("name", "checksum") VALUES ($1, $2)`,
      [migration.name, checksum]
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const connectionString = getMigrationDatabaseUrl();
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await ensureMigrationTable(client);
    const migrations = await listMigrationFiles();

    let appliedCount = 0;

    for (const migration of migrations) {
      const applied = await applyMigration(client, migration);
      if (applied) {
        appliedCount += 1;
        console.log(`Applied migration ${migration.name}`);
      }
    }

    if (appliedCount === 0) {
      console.log("No pending Postgres migrations.");
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
