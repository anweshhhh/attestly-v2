# Review Brief

## Scope of this change
- Slice / task: production migration execution fix for the Vercel launch path
- Goal: remove ambiguity around applying the checked-in Neon Postgres schema before production traffic reaches the app

## What changed
- Tightened the checked-in Postgres migration runner so the production path requires `DIRECT_DATABASE_URL` instead of silently falling back to the pooled runtime URL.
- Added one explicit production command: `npm run db:migrate:production`.
- Updated the README, launch runbook, env example, and handoff docs so operators know the exact migration step to run before first production launch and after future schema changes.

## Files touched
- `package.json`
- `.env.example`
- `README.md`
- `scripts/apply-postgres-migrations.mjs`
- `docs/launch-runbook.md`
- `docs/build-log.md`
- `docs/context.md`
- `docs/review-brief.md`

## Assumptions introduced
- Production Neon migrations should always use the direct Neon connection string in `DIRECT_DATABASE_URL`.
- `DATABASE_URL` remains the pooled runtime connection string and is not the canonical operator path for production schema application.

## Contract-sensitive areas
- schema: unchanged
- lifecycle: unchanged
- UX/IA: unchanged
- RBAC/auth: unchanged
- evidence/generation/export: unchanged

## Tests run
- `npm run db:migrate:production -- --help`
- `DATABASE_URL='postgresql://user:password@localhost:5432/attestly' npm run db:migrate:deploy`
- result: production migration command is now explicit, and the deploy alias fails fast with a clear error when `DIRECT_DATABASE_URL` is missing

## Risks / watchouts
- Production login will continue to fail until the live Neon database has had `npm run db:migrate:production` run against it successfully.
- Operators still need to wire the pooled Neon URL into `DATABASE_URL` and the direct Neon URL into `DIRECT_DATABASE_URL` correctly in Vercel.

## Recommended next step
- Run `npm run db:migrate:production` against the production Neon database, then retry Google OAuth login on the live Vercel deployment.
