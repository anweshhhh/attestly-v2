# Attestly V2

Attestly V2 currently ships the complete phase-1 Trust Pack Generator wedge:

- workspace bootstrap and identity
- evidence upload and processing into citation-usable chunks
- AI Profile Wizard with save/resume and immutable completion
- Trust Pack generation for one logical pack per workspace
- current-version review
- version approval
- buyer-safe Markdown export
- workspace-scoped RBAC for `OWNER`, `ADMIN`, `REVIEWER`, and `VIEWER`

The shipped phase-1 workflow is:

`Workspace -> Upload Evidence -> Complete AI Profile -> Generate Trust Pack -> Review current version -> Approve version -> Export Markdown`

## Local development

1. Install dependencies: `npm install`
2. Create a local env file from `.env.example`
3. Generate Prisma client: `npm run prisma:generate`
4. Apply migrations: `npm run db:init`
5. Configure a Google OAuth app with `http://localhost:3000/api/auth/callback/google` as an allowed callback URL
6. Start the app: `npm run dev`

Local development now expects Postgres rather than SQLite. The checked-in `.env.example` uses a local Postgres URL on `127.0.0.1:55432` and defaults evidence storage to the mock Blob backend so you can develop the wedge without local disk uploads wiring.

If you want a quick local Postgres instance that matches the default `.env.example`, one option is:

```bash
docker run --name attestly-v2-dev-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=attestly_dev \
  -p 55432:5432 \
  -d postgres:15
```

Use a verified Google work identity on `/login`. If that user has no memberships yet, Attestly bootstraps the first workspace after sign-in. Later members can be added from `Settings / Team`.

## Hosted deployment

Attestly phase 1 now targets Vercel-compatible deployment with Neon Postgres and Vercel Blob:

- `DATABASE_URL` uses the pooled Neon Postgres URL for the app runtime
- `DIRECT_DATABASE_URL` uses the direct Neon Postgres URL for deploy-time migrations
- evidence uploads go to Vercel Blob instead of a local uploads directory
- a long random `AUTH_SECRET` or `NEXTAUTH_SECRET` is required
- Google OAuth must be configured for the public callback URL

Recommended production env:

```bash
DATABASE_URL="postgresql://user:password@ep-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require"
BLOB_STORAGE_BACKEND="vercel-blob"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
AUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="https://app.attestly.example"
GOOGLE_CLIENT_ID="replace-with-google-client-id"
GOOGLE_CLIENT_SECRET="replace-with-google-client-secret"
NODE_ENV="production"
```

Deployment sequence:

1. Install dependencies: `npm install`
2. Generate Prisma client: `npm run prisma:generate`
3. Apply Postgres migrations against Neon from a trusted shell or CI step: `npm run db:migrate:deploy`
4. Deploy to Vercel with `npm run build` as the build command
5. Use `npm start` only for local production simulation outside Vercel

Hosted runtime notes:

- `DATABASE_URL` should be the pooled Neon URL used by the app runtime.
- `DIRECT_DATABASE_URL` should be the direct Neon URL used when applying deploy-time migrations.
- `BLOB_STORAGE_BACKEND` must be `vercel-blob` in production and `BLOB_READ_WRITE_TOKEN` must be present.
- Evidence uploads now go directly to Blob from the browser and finalize server-side, which preserves the shipped 10 MB evidence limit in Vercel-compatible runtimes.
- `NEXTAUTH_URL` should match the public app origin used in the Google OAuth configuration.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must come from a Google OAuth client that uses `/api/auth/callback/google` on your deployed domain.
- `npm run db:migrate:deploy` applies the checked-in Postgres SQL migrations from `prisma/postgres-migrations`.
- The legacy SQLite migration files are retained only as pre-migration history; the Vercel/Neon production path uses `prisma/postgres-migrations`.
- Markdown export is generated in-memory and streamed directly from the current approved or exported version. It does not rely on temp files.

For launch-day rollout steps, stop-ship criteria, and the end-to-end smoke checklist, use [docs/launch-runbook.md](/Users/anweshsingh/Downloads/Attestly/attestly-v2/docs/launch-runbook.md).

## Tests

- `npm test`
- `npm run build`
