import path from "node:path";

export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024;

const DEFAULT_DEV_AUTH_SECRET = "dev-attestly-v2-auth-secret";
const PLACEHOLDER_AUTH_SECRET = "replace-me-with-a-long-random-string";

export const BlobStorageBackend = {
  VERCEL_BLOB: "vercel-blob",
  MOCK: "mock"
} as const;

export type BlobStorageBackend = (typeof BlobStorageBackend)[keyof typeof BlobStorageBackend];

type RuntimeEnv = NodeJS.ProcessEnv;

function isProductionRuntime(env: RuntimeEnv) {
  return env.NODE_ENV === "production";
}

function getEnvValue(env: RuntimeEnv, keys: string[]) {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function isPostgresConnectionString(value: string) {
  return value.startsWith("postgresql://") || value.startsWith("postgres://");
}

function assertAbsoluteUrl(value: string, label: string) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }
}

export function getAuthSecret(env: RuntimeEnv = process.env) {
  const authSecret = getEnvValue(env, ["AUTH_SECRET", "NEXTAUTH_SECRET", "SESSION_SECRET"]);
  if (authSecret) {
    return authSecret;
  }

  if (isProductionRuntime(env)) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required in production.");
  }

  return DEFAULT_DEV_AUTH_SECRET;
}

export function getAuthBaseUrl(env: RuntimeEnv = process.env) {
  const authBaseUrl = getEnvValue(env, ["NEXTAUTH_URL", "AUTH_URL"]);
  if (!authBaseUrl) {
    if (isProductionRuntime(env)) {
      throw new Error("NEXTAUTH_URL is required in production.");
    }

    return null;
  }

  return authBaseUrl;
}

export function getGoogleClientId(env: RuntimeEnv = process.env) {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is required.");
  }

  return clientId;
}

export function getGoogleClientSecret(env: RuntimeEnv = process.env) {
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is required.");
  }

  return clientSecret;
}

export function getDatabaseUrl(env: RuntimeEnv = process.env) {
  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!isPostgresConnectionString(databaseUrl)) {
    throw new Error("DATABASE_URL must be a postgres:// or postgresql:// connection string.");
  }

  return databaseUrl;
}

export function getDirectDatabaseUrl(env: RuntimeEnv = process.env) {
  const directDatabaseUrl = getEnvValue(env, ["DIRECT_DATABASE_URL", "DATABASE_DIRECT_URL"]);

  if (!directDatabaseUrl) {
    if (isProductionRuntime(env)) {
      throw new Error("DIRECT_DATABASE_URL is required in production for deploy-time migrations.");
    }

    return null;
  }

  if (!isPostgresConnectionString(directDatabaseUrl)) {
    throw new Error("DIRECT_DATABASE_URL must be a postgres:// or postgresql:// connection string.");
  }

  return directDatabaseUrl;
}

export function getBlobReadWriteToken(env: RuntimeEnv = process.env) {
  return getEnvValue(env, ["BLOB_READ_WRITE_TOKEN", "VERCEL_BLOB_READ_WRITE_TOKEN"]);
}

export function getBlobStorageBackend(env: RuntimeEnv = process.env): BlobStorageBackend {
  const configuredBackend = env.BLOB_STORAGE_BACKEND?.trim();
  if (configuredBackend) {
    if (configuredBackend === BlobStorageBackend.VERCEL_BLOB || configuredBackend === BlobStorageBackend.MOCK) {
      return configuredBackend;
    }

    throw new Error("BLOB_STORAGE_BACKEND must be either 'vercel-blob' or 'mock'.");
  }

  if (isProductionRuntime(env)) {
    return BlobStorageBackend.VERCEL_BLOB;
  }

  return getBlobReadWriteToken(env) ? BlobStorageBackend.VERCEL_BLOB : BlobStorageBackend.MOCK;
}

export function getBlobMockRoot(env: RuntimeEnv = process.env) {
  const configuredRoot = env.BLOB_MOCK_ROOT?.trim();
  if (configuredRoot) {
    return path.isAbsolute(configuredRoot) ? configuredRoot : path.resolve(process.cwd(), configuredRoot);
  }

  return path.join(process.cwd(), ".blob-mock");
}

export function assertServerRuntimeEnv(env: RuntimeEnv = process.env) {
  const databaseUrl = getDatabaseUrl(env);
  const directDatabaseUrl = getDirectDatabaseUrl(env);
  const authSecret = getAuthSecret(env);
  const authBaseUrl = getAuthBaseUrl(env);
  const googleClientId = getGoogleClientId(env);
  const googleClientSecret = getGoogleClientSecret(env);
  const storageBackend = getBlobStorageBackend(env);
  const blobReadWriteToken = getBlobReadWriteToken(env);
  const blobMockRoot = getBlobMockRoot(env);

  if (isProductionRuntime(env)) {
    if (authSecret === DEFAULT_DEV_AUTH_SECRET || authSecret === PLACEHOLDER_AUTH_SECRET) {
      throw new Error("AUTH_SECRET or NEXTAUTH_SECRET must be replaced with a long random value in production.");
    }

    if (!authBaseUrl) {
      throw new Error("NEXTAUTH_URL must be set in production.");
    }

    assertAbsoluteUrl(authBaseUrl, "NEXTAUTH_URL");
    assertAbsoluteUrl(databaseUrl, "DATABASE_URL");

    if (!directDatabaseUrl) {
      throw new Error("DIRECT_DATABASE_URL must be set in production.");
    }

    assertAbsoluteUrl(directDatabaseUrl, "DIRECT_DATABASE_URL");

    if (storageBackend !== BlobStorageBackend.VERCEL_BLOB) {
      throw new Error("Production deployments must use BLOB_STORAGE_BACKEND=vercel-blob.");
    }

    if (!blobReadWriteToken) {
      throw new Error("BLOB_READ_WRITE_TOKEN is required in production.");
    }
  }

  if (storageBackend === BlobStorageBackend.VERCEL_BLOB && !blobReadWriteToken) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required when BLOB_STORAGE_BACKEND=vercel-blob.");
  }

  return {
    databaseUrl,
    directDatabaseUrl,
    authSecret,
    authBaseUrl,
    googleClientId,
    googleClientSecret,
    storageBackend,
    blobReadWriteToken,
    blobMockRoot
  };
}
