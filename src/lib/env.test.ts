import { describe, expect, it } from "vitest";
import {
  BlobStorageBackend,
  assertServerRuntimeEnv,
  getBlobMockRoot,
  getBlobStorageBackend
} from "@/lib/env";

describe("runtime env validation", () => {
  it("allows Postgres plus mock Blob defaults outside production", () => {
    expect(
      assertServerRuntimeEnv({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public",
        GOOGLE_CLIENT_ID: "local-google-client-id",
        GOOGLE_CLIENT_SECRET: "local-google-client-secret"
      })
    ).toMatchObject({
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55432/attestly_dev?schema=public",
      storageBackend: BlobStorageBackend.MOCK
    });
  });

  it("requires a non-placeholder auth secret in production", () => {
    expect(() =>
      assertServerRuntimeEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example/app?sslmode=require",
        DIRECT_DATABASE_URL: "postgresql://user:pass@db-direct.example/app?sslmode=require",
        BLOB_STORAGE_BACKEND: "vercel-blob",
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        NEXTAUTH_URL: "https://app.attestly.example",
        AUTH_SECRET: "replace-me-with-a-long-random-string"
      })
    ).toThrow("AUTH_SECRET or NEXTAUTH_SECRET must be replaced");
  });

  it("requires a Postgres connection string", () => {
    expect(() =>
      assertServerRuntimeEnv({
        NODE_ENV: "development",
        DATABASE_URL: "file:./dev.db",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret"
      })
    ).toThrow("DATABASE_URL must be a postgres:// or postgresql:// connection string.");
  });

  it("requires a direct Postgres URL in production", () => {
    expect(() =>
      assertServerRuntimeEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example/app?sslmode=require",
        BLOB_STORAGE_BACKEND: "vercel-blob",
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        NEXTAUTH_URL: "https://app.attestly.example",
        AUTH_SECRET: "production-secret-value"
      })
    ).toThrow("DIRECT_DATABASE_URL is required");
  });

  it("requires Blob token when vercel-blob storage is selected", () => {
    expect(() =>
      assertServerRuntimeEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example/app?sslmode=require",
        DIRECT_DATABASE_URL: "postgresql://user:pass@db-direct.example/app?sslmode=require",
        BLOB_STORAGE_BACKEND: "vercel-blob",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        NEXTAUTH_URL: "https://app.attestly.example",
        AUTH_SECRET: "production-secret-value"
      })
    ).toThrow("BLOB_READ_WRITE_TOKEN is required");
  });

  it("requires a production auth callback URL", () => {
    expect(() =>
      assertServerRuntimeEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@db.example/app?sslmode=require",
        DIRECT_DATABASE_URL: "postgresql://user:pass@db-direct.example/app?sslmode=require",
        BLOB_STORAGE_BACKEND: "vercel-blob",
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        AUTH_SECRET: "production-secret-value"
      })
    ).toThrow("NEXTAUTH_URL is required");
  });

  it("resolves relative mock roots for local development", () => {
    expect(
      getBlobMockRoot({
        NODE_ENV: "development",
        BLOB_MOCK_ROOT: "./.blob-mock"
      })
    ).toContain("/.blob-mock");
  });

  it("defaults to Blob in production and mock in local development without a token", () => {
    expect(getBlobStorageBackend({ NODE_ENV: "production" })).toBe(BlobStorageBackend.VERCEL_BLOB);
    expect(getBlobStorageBackend({ NODE_ENV: "development" })).toBe(BlobStorageBackend.MOCK);
  });
});
