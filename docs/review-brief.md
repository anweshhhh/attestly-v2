# Review Brief

## Deployment-platform migration completed
- Migrated the production platform target from SQLite plus local uploaded-file storage to Neon Postgres, Vercel Blob, and Vercel-compatible evidence upload/runtime behavior.
- Preserved the shipped phase-1 workflow exactly: verified sign-in, workspace setup, evidence upload/processing, AI Profile, trust-pack generation, review, approval, and Markdown export.
- No product scope or lifecycle behavior changed in this task.

## What migrated
- Prisma runtime now uses Postgres with `DATABASE_URL` plus `DIRECT_DATABASE_URL`.
- Production migrations now run through the checked-in Postgres SQL path in `prisma/postgres-migrations` via `scripts/apply-postgres-migrations.mjs`.
- Evidence uploads now go directly to Blob from the browser and finalize server-side into the existing evidence-processing pipeline.
- Evidence retry/processing now reads stored files through the storage layer instead of local filesystem paths.
- Env validation, README, and launch runbook now describe the Vercel + Neon + Blob deployment shape.

## Remaining Vercel launch blockers, if any
- No code-level Vercel blocker remains in the shipped wedge.
- Launch still depends on provisioning the real Neon pooled/direct URLs, Vercel Blob token, Google OAuth production credentials, and `NEXTAUTH_URL` on the actual Vercel project.

## Why the wedge is or is not ready for Vercel deployment
- The wedge is ready for Vercel deployment because the production database path is now Postgres-compatible, evidence storage no longer depends on local persistent disk, the Google OAuth model is already in place, and the full shipped wedge still passes end-to-end smoke coverage on the migrated stack.
- The remaining work is deployment execution, not additional product or runtime migration work.
