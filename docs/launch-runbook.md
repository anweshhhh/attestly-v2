# Launch Runbook

## Scope
This runbook covers controlled rollout of the shipped phase-1 Attestly wedge only:

`Verified sign-in -> Workspace setup -> Evidence upload/processing -> AI Profile Wizard -> Trust-pack generation -> Current-version review -> Version approval -> Markdown export`

It does not add new product scope or new runtime architecture.

## Runtime Requirements

### Required environment variables
| Variable | Required for launch | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Neon Postgres URL used by the app runtime |
| `DIRECT_DATABASE_URL` | Yes | Direct Neon Postgres URL used for deploy-time migrations |
| `BLOB_STORAGE_BACKEND=vercel-blob` | Yes | Forces Blob-backed evidence storage in production |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob read/write token for evidence uploads and reads |
| `AUTH_SECRET` or `NEXTAUTH_SECRET` | Yes | Auth.js session signing secret |
| `NEXTAUTH_URL` | Yes | Public app origin used for OAuth callbacks |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth web application client id |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth web application client secret |
| `NODE_ENV=production` | Yes | Production runtime mode |

### Persistent resources
- Neon Postgres project with both pooled and direct connection strings
- Vercel Blob store with a read/write token available to the app
- Current launch shape is Vercel-compatible and no longer depends on mounted local disk for evidence storage

### Google OAuth configuration
Use a Google OAuth web application client.

Production values:
- Authorized JavaScript origin: `https://<launch-domain>`
- Authorized redirect URI: `https://<launch-domain>/api/auth/callback/google`

Local development values:
- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### Build and startup sequence
1. `npm install`
2. `npm run prisma:generate`
3. Set `DIRECT_DATABASE_URL` to the direct Neon connection string in the Vercel project
4. Deploy on Vercel with the checked-in `build:vercel` command from `vercel.json`, which runs `npm run db:migrate:production` before `next build`
5. Use `npm start` only for local production simulation, not for the Vercel-hosted production path

If the Vercel dashboard currently overrides the Build Command, set it to `npm run build:vercel` or clear the override so `vercel.json` is honored.

### Export/download runtime note
- Markdown export is generated in memory and streamed directly from the approved or exported version
- No temp-file export path is required for launch

## Pre-Launch Validation
Run this before opening access beyond internal operators.

1. Confirm env is complete
Expected: all required variables above are set for the real launch domain
Launch blocker: missing Neon URLs, Blob token, `NEXTAUTH_URL`, Google OAuth credentials, or auth secret

2. Confirm Neon and Blob configuration is valid
Expected: the app can connect to Neon and Vercel Blob with the configured credentials
Launch blocker: invalid pooled/direct DB URL, missing Blob token, or wrong project/store configuration

3. Apply migrations
Command: `npm run db:migrate:production` or trigger a Vercel deployment that uses `npm run build:vercel`
Expected: migration runner completes successfully
Launch blocker: migration failure, wrong database path, or `DIRECT_DATABASE_URL` missing

4. Build production artifact
Command: `npm run build`
Expected: production build completes successfully with real launch env
Launch blocker: env validation failure or production build failure

5. Start the app on the real launch domain
Command: deploy the current build to Vercel after migrations are applied
Expected: app serves requests on the real domain and the login page loads
Launch blocker: runtime crash, OAuth callback mismatch, or Blob/DB startup failure

6. Verify Google OAuth on the real launch domain
Expected: sign-in redirects to Google and returns to `/api/auth/callback/google` on the same launch domain without auth errors
Launch blocker: redirect mismatch, invalid client credentials, or failed callback

## Launch Smoke Checklist
Run this on the real launch environment with one verified Google account.

| Step | What to do | Expected result | Launch blocker |
| --- | --- | --- | --- |
| 1 | Sign in with a verified Google identity | User lands in the app successfully | OAuth redirect/callback fails or session is not established |
| 2 | Create or open a workspace | Existing workspace opens, or a first workspace is bootstrapped automatically | User cannot reach a workspace after sign-in |
| 3 | Upload one trust-relevant document in Evidence | Upload succeeds and processing completes | Upload fails, processing fails, or document never becomes citation-usable |
| 4 | Complete AI Profile | Wizard saves, resumes if needed, and completes into an immutable profile | Draft save fails, completion fails, or profile never becomes completed |
| 5 | Generate Trust Pack | Current logical trust pack gets a new `DRAFT` version | Generation is blocked despite ready inputs, or generation crashes |
| 6 | Review current version | Trust Packs surface renders sections, claims, and provenance | Review surface fails to load or claims/citations are missing unexpectedly |
| 7 | Approve version | `READY_FOR_REVIEW` version transitions to `APPROVED` | Approval is blocked incorrectly or lifecycle state is wrong |
| 8 | Export Markdown | Download returns the buyer-safe Markdown artifact with citations/evidence appendix | Export fails, wrong version exports, or download is malformed |

## Stop-Ship vs Monitor

### Stop-ship issues
- Production migrations were not applied, including login failures caused by missing tables such as `public.User`
- Sign-in or callback failure on the real launch domain
- Workspace cannot be opened after login
- Evidence upload or processing fails for normal documents
- AI Profile cannot save or complete
- Trust-pack generation fails with ready inputs
- Current version cannot be loaded for review
- Approval transition fails for an otherwise valid version
- Markdown export/download fails or returns the wrong version
- Neon or Blob configuration prevents the runtime from reading/writing evidence or persisted state

### Monitor-after-launch issues
- Cosmetic copy issues that do not block the wedge
- Non-critical styling/layout issues on secondary screens
- Slow but successful generation or export
- Minor warning/error copy that is understandable and recoverable
- Later-scope requests such as version history, claim editing, questionnaire reuse, or additional export formats

## Immediate Post-Launch Stabilization
- Watch authentication failures first: OAuth callback errors, unexpected sign-out loops, or users landing without workspace access
- Watch storage and DB failures next: Neon connection errors, migration errors, Blob token/storage failures, or evidence reads/writes failing in the hosted runtime
- Watch wedge-critical product failures next: evidence processing errors, AI Profile completion errors, generation failures, approval errors, export download failures
- Check first in:
  - app/server logs
  - auth callback errors
  - migration output
  - Neon connection/configuration
  - Blob token/storage configuration
  - error banners reported on `Evidence`, `AI Profile`, and `Trust Packs`

## Launch Decision
- Launch is ready when all pre-launch validation steps pass and the full smoke checklist succeeds on the real launch domain
- If any stop-ship issue above fails, hold launch and fix that issue before expanding access
