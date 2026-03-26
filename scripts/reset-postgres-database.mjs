import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getConnectionString() {
  const connectionString = process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("DIRECT_DATABASE_URL or DATABASE_URL is required.");
  }

  if (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://")) {
    throw new Error("Postgres reset requires a postgres:// or postgresql:// connection string.");
  }

  return connectionString;
}

async function main() {
  const connectionString = getConnectionString();
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('DROP SCHEMA IF EXISTS "public" CASCADE');
    await client.query('CREATE SCHEMA "public"');
  } finally {
    await client.end();
  }

  execFileSync(process.execPath, [path.join(__dirname, "apply-postgres-migrations.mjs")], {
    cwd: path.resolve(__dirname, ".."),
    env: process.env,
    stdio: "inherit"
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
