import fs from "node:fs/promises";
import { Client } from "pg";
import { prisma } from "@/lib/prisma";
import { applyTestMigrations, getTestBlobMockRoot, getTestDatabaseUrl } from "@/test/postgres-runtime";

export async function resetDatabase() {
  await prisma.$disconnect();
  await fs.rm(getTestBlobMockRoot(), { recursive: true, force: true });

  const client = new Client({
    connectionString: process.env.DIRECT_DATABASE_URL || getTestDatabaseUrl()
  });

  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS "public" CASCADE');
    await client.query('CREATE SCHEMA "public"');
  } finally {
    await client.end();
  }

  applyTestMigrations();
}

export async function seedWorkspaceOwner(params: { email: string; name?: string }) {
  const { bootstrapWorkspaceForUser } = await import("@/lib/workspaces");
  return bootstrapWorkspaceForUser({
    email: params.email,
    name: params.name
  });
}
