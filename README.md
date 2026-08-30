# Ecora

A mobile-first platform for reporting, AI-detecting, and managing
underwater/environmental debris complaints: citizens submit a photo and
location, an on-device-independent YOLO26 model flags likely debris, and an
administrator reviews, risk-scores, assigns, and resolves the report.

## Repo layout

```
apps/web/            Next.js 16 (App Router) — citizen + admin UI, server actions
services/inference/  Python FastAPI — YOLO26 inference microservice
packages/shared/     Shared TS enums/types (status, risk, roles, complaint numbering)
infra/db/            Docker Compose (Postgres+PostGIS, MinIO) + SQL migrations
```

## Local development

### 1. Infrastructure (Postgres+PostGIS, MinIO)

```bash
cd infra/db
docker compose up -d
```

Migrations under `infra/db/migrations/` run automatically on first boot via
the compose file's `docker-entrypoint-initdb.d` mount — nothing to run by
hand. To reset to a pristine DB (drops all data): `docker compose down -v && docker compose up -d`.

### 2. Web app (`apps/web`)

```bash
cd apps/web
cp .env.example .env    # apps/web only reads its own .env, not the root one
npm install
npm run dev              # http://localhost:3000
```

Other scripts: `npm run build && npm start` (production build — always the
one used for verification in this project, not `next dev`), `npm run lint`,
`npm run typecheck`, `npm test` (vitest, needs the infra above running).

Submitting a complaint calls the inference pipeline
(`lib/inference/process-job.ts`) synchronously, in-request — there's no
separate worker process to start. The citizen waits through it (~7-10s);
see "Architecture notes" below.

### 3. Inference service (`services/inference`)

```bash
cd services/inference
python -m venv .venv
.venv/Scripts/activate    # Windows; `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

`models/best.pt` / `models/best.onnx` are already checked in. See
`services/inference/README.md` for the `/health` and `/infer` contract and
the `.pt` vs `.onnx` runtime split.

### Running everything together

Three processes for a fully working local stack: `docker compose up -d`
(infra), `uvicorn app.main:app --port 8000` (inference), `npm run dev`
(web). Submit a complaint through the web UI and watch it move
`SUBMITTED` → `AI_ANALYSIS_PENDING` → `UNDER_REVIEW` — the citizen waits
through the last transition now (~7-10s), since it's a real inference call.

## Architecture notes worth knowing before touching this codebase

- **Inference runs synchronously in-request, no queue/worker.** The
  submission server action (`lib/complaints/actions/submit.ts`) calls
  `lib/inference/process-job.ts` directly rather than enqueuing it for a
  separate process. This is a deliberate simplification for a $0,
  no-sustained-load deployment (a hackathon demo, not production traffic) —
  the natural design for real concurrent load is an async queue (Redis +
  a worker process) so submission never blocks on inference, and that
  design is straightforward to reintroduce if this ever needs to handle
  real traffic. If a complaint ever gets stuck at `AI_ANALYSIS_PENDING`
  after a transient inference failure, the admin complaint-review page has
  a "Retry AI analysis" action — that's the recovery path in the current
  synchronous design, in place of a queue-based automatic retry.
- **AI results are never shown to a citizen as fact.** Every citizen-visible
  message from the inference pipeline, admin status changes, and public
  updates is deliberately generic ("under review", "action in progress"),
  never "we detected N plastic bottles." Only an administrator's verified
  category/risk is treated as authoritative, and even then the UI
  distinguishes AI-suggested from admin-verified values.
- **Reports generate synchronously** — a summary PDF or CSV export is a
  handful of queries plus in-process file assembly, fast enough not to need
  any async handling.
- **Notifications** are tracked per-channel in the `notifications` table
  (`status`: pending → sent/failed) — in-app rows are written transactionally
  with the event; email is attempted only after the triggering transaction
  commits, so a slow/failing send can never block or roll back the mutation
  that triggered it.

## Testing

- `apps/web`: `npm test` (vitest) — uses the real Postgres/MinIO from
  `infra/db/docker-compose.yml`, not mocks, for anything that talks to them;
  only genuinely external calls (the inference service's HTTP contract,
  geocoding) are mocked.
- `services/inference`: `pytest` from `services/inference` (after activating
  the venv above).

## Deployment

**For the actual deployment target used for this project (Vercel + Neon +
Cloudflare R2 + Hugging Face Spaces, chosen for a $0-cost, no-sustained-load
hackathon deployment) — copy-pasteable steps in [`DEPLOY.md`](./DEPLOY.md).**
The rest of this section is the platform-agnostic version, for a different
or future (real-traffic) deployment target — a single always-on VM running
the Docker Compose stack as-is, or separately-hosted managed services with
the async queue/worker design reintroduced, are both reasonable choices
once real concurrent traffic is a goal.

**Three deployable units**, each independently buildable/scalable:
1. `apps/web` — `npm run build` then `npm start` (or containerize: multi-stage
   Docker build, `next build` in the build stage, `next start` in the run
   stage). No separate worker process to run alongside it in the current
   synchronous-inference design: inference runs inside the submission
   server action. On a per-function-timeout platform (e.g. Vercel), that
   action's `maxDuration` must be configured explicitly — see `DEPLOY.md`.
2. `services/inference` — a standard ASGI app; run behind `uvicorn`/`gunicorn
   -k uvicorn.workers.UvicornWorker` or containerize with a Python base image
   that has the model weights baked in or mounted.
3. Managed/self-hosted Postgres+PostGIS and S3-compatible storage —
   `infra/db/docker-compose.yml` is local-dev only (plaintext credentials,
   no replication/backups) and is explicitly commented as such; production
   needs real managed equivalents.

**Before going to production:**
- Set every var in the root `.env.example` to real, unique secrets —
  `NEXTAUTH_SECRET`, `JWT_SECRET`, and the storage/DB credentials are
  placeholder values in every checked-in `.env.example` and must never be
  reused as-is.
- Set `EMAIL_PROVIDER_API_KEY` to a real Resend key — without it the app
  silently falls back to a console-log email transport (correct for local
  dev, silently wrong in production).
- Confirm `NEXTAUTH_URL` matches the real public URL — it's baked into
  every auth callback and the links in transactional emails.
- Run the SQL migrations under `infra/db/migrations/` against the
  production database before first deploy (they're only auto-applied by the
  local dev Compose file's init-script mount, not in production).
- Point `YOLO_MODEL_PATH`/`YOLO_RUNTIME` at wherever the model weights live
  in that environment, and `INFERENCE_SERVICE_URL` at the reachable internal
  address of the deployed inference service.
