import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { Client } from "pg";

const defaultDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:55432/attestly_test?schema=public";
const defaultContainerName = "attestly-v2-test-postgres";
const defaultPostgresImage = "postgres:15";

function runDockerCommand(args: string[]) {
  const result = spawnSync("docker", args, {
    stdio: "pipe",
    encoding: "utf8"
  });

  if (result.error) {
    throw new Error(
      "Docker is required for the default Postgres test runtime. Set TEST_DATABASE_URL if you want to use an existing Postgres instance."
    );
  }

  return result;
}

function ensureDockerBackedTestPostgres() {
  const inspect = runDockerCommand(["inspect", defaultContainerName]);

  if (inspect.status !== 0) {
    const runResult = runDockerCommand([
      "run",
      "-d",
      "--name",
      defaultContainerName,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-e",
      "POSTGRES_DB=attestly_test",
      "-p",
      "55432:5432",
      defaultPostgresImage
    ]);

    if (runResult.status !== 0) {
      throw new Error(runResult.stderr || "Could not start the test Postgres container.");
    }

    return;
  }

  const isRunning = runDockerCommand([
    "inspect",
    "-f",
    "{{.State.Running}}",
    defaultContainerName
  ]);

  if (isRunning.stdout.trim() !== "true") {
    const startResult = runDockerCommand(["start", defaultContainerName]);
    if (startResult.status !== 0) {
      throw new Error(startResult.stderr || "Could not start the existing test Postgres container.");
    }
  }
}

async function waitForDatabase(connectionString: string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const client = new Client({ connectionString });

    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch {
      try {
        await client.end();
      } catch {
        // Ignore secondary disconnect errors while the DB is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error("Timed out waiting for the Postgres test database to become ready.");
}

export function getTestDatabaseUrl() {
  return process.env.TEST_DATABASE_URL?.trim() || defaultDatabaseUrl;
}

export function getTestBlobMockRoot() {
  return path.join(process.cwd(), ".blob-mock");
}

export async function ensureTestRuntime() {
  const databaseUrl = getTestDatabaseUrl();

  if (!process.env.TEST_DATABASE_URL) {
    ensureDockerBackedTestPostgres();
    await waitForDatabase(databaseUrl);
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_DATABASE_URL = process.env.TEST_DIRECT_DATABASE_URL?.trim() || databaseUrl;
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "test-attestly-v2-auth-secret";
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
  process.env.BLOB_STORAGE_BACKEND = process.env.BLOB_STORAGE_BACKEND || "mock";
  process.env.BLOB_MOCK_ROOT = process.env.BLOB_MOCK_ROOT || getTestBlobMockRoot();
}

export function applyTestMigrations() {
  execFileSync(process.execPath, [path.join(process.cwd(), "scripts", "apply-postgres-migrations.mjs")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || getTestDatabaseUrl(),
      DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL || getTestDatabaseUrl()
    },
    stdio: "ignore"
  });
}
