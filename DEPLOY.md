# Deploying Ecora (free tier): Vercel + Neon + Backblaze B2 + Hugging Face Spaces

CLAUDE.md §13's current hosting decision, for a hackathon deployment with a
hard $0 constraint and no sustained load. This is the copy-pasteable
version — every architecture decision it depends on (synchronous inference,
no queue/worker, B2-compatible storage config, Vercel `maxDuration`) is
already built and verified; see `PROGRESS.md` for what that verification
covered. Nothing below requires further engineering judgment calls — paste
in credentials, follow the steps, deploy.

**Object storage is Backblaze B2, not Cloudflare R2.** R2 was the original
target but turned out to require a credit card on file even for its free
tier (confirmed against R2's own community forum, contradicting its
marketing copy) — a hard blocker under this project's $0-with-no-card
constraint. B2's free 10GB tier genuinely requires no card. The code still
supports R2 (§2 below documents both) in case that changes.

None of these accounts were created or tested end-to-end during this
project's own build (no credentials were available to do so) — every step
below is grounded in each platform's current official documentation, and
the *code* changes it depends on (storage-provider checksum compatibility,
`maxDuration`) were verified locally against real MinIO/real inference. The
**first real deploy is the first time this exact path runs against real
Neon/B2/HF Spaces** — budget time for at least one round of "paste a
typo'd env var, watch it fail, fix it" the first time through.

## 1. Database — Neon

1. Create a free account at [neon.tech](https://neon.tech), then a new
   project (any region close to your Vercel deployment's region is fine —
   Neon and Vercel don't need to be co-located for a hackathon's traffic
   level).
2. Neon gives you **two** connection strings for the same database — this
   matters, don't use the wrong one for the wrong purpose:
   - **Pooled** (hostname contains `-pooler`) — use this for the app's
     `DATABASE_URL` in Vercel. Vercel functions are serverless/connection-
     per-invocation; Neon's pooled endpoint routes through a managed
     PgBouncer in transaction mode so you don't exhaust Postgres's native
     connection limit under concurrent requests. This app doesn't use
     `LISTEN`/`NOTIFY`, advisory locks, or other session-level features
     that transaction-mode pooling can't support, so the pooled endpoint is
     safe here (confirmed by grepping the codebase for those patterns —
     none found).
   - **Direct/unpooled** — use this only for running the migrations below
     (Neon's own guidance: some DDL/session patterns are safer over the
     direct connection; migrations are a one-time/rare operation, not
     per-request traffic, so there's no pooling benefit to lose).
3. Enable PostGIS — connect via the Neon SQL Editor (in the dashboard) or
   `psql` using the **direct** connection string, and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS citext;
   ```
   (Confirmed via Neon's current documentation: all three are on Neon's
   supported-extensions list for every Postgres version Neon offers, no
   special plan or prerequisite — this is the exact statement already in
   `infra/db/migrations/0001_extensions.sql`, so if you run the migrations
   below via `psql -f`, this happens automatically as migration 0001; the
   explicit step above is only if you want to sanity-check it in isolation
   first.) One documented community report exists of the extension
   appearing unavailable after repeated compute auto-suspend/resume
   cycles — not called out as expected behavior in Neon's own docs, so if
   you ever hit `extension "postgis" does not exist` after a period of
   inactivity, just re-run the `CREATE EXTENSION IF NOT EXISTS postgis;`
   line above; it's idempotent.
4. Run every migration in order, against the **direct** connection string:
   ```bash
   for f in infra/db/migrations/*.sql; do
     psql "<your Neon DIRECT connection string>" -v ON_ERROR_STOP=1 -f "$f"
   done
   ```
   (Unlike local dev, where the Postgres Docker image auto-applies these
   via `docker-entrypoint-initdb.d`, Neon is a plain existing database —
   nothing runs these for you.)
5. Set `DATABASE_URL` in Vercel to the **pooled** connection string.

## 2. Object storage — Backblaze B2 (primary), Cloudflare R2 (still supported)

### Option A — Backblaze B2 (recommended: no card required)

1. Create a free Backblaze account at
   [backblaze.com/sign-up/cloud-storage](https://www.backblaze.com/sign-up/cloud-storage)
   — the free tier (10GB storage, 1GB/day download) genuinely requires no
   credit card, unlike R2 (see below).
2. Create a bucket (B2 dashboard → Buckets → Create a Bucket). Buckets are
   **private** by default — leave it that way; this app only ever serves
   images via signed URLs (CLAUDE.md §0), never a public bucket path.
3. Create an **Application Key** (B2 dashboard → Application Keys → Add a
   New Application Key) scoped to that bucket, with Read and Write
   capabilities. This gives you a **keyID** (→ `STORAGE_ACCESS_KEY`) and an
   **applicationKey** (→ `STORAGE_SECRET_KEY`) — save both, the secret is
   only shown once. (Note: this is a B2 *Application Key*, not your B2
   *account*'s master key — B2's own docs require the scoped key for API
   access; the master key can't be used directly.)
4. Find your bucket's **S3 Endpoint** — shown right on the bucket's detail
   page in the B2 dashboard, in the form `s3.<region-code>.backblazeb2.com`
   (e.g. `s3.us-west-004.backblazeb2.com`). **The region code is embedded in
   that hostname** — B2 has no separate "region" setting to look up
   elsewhere; read it off the endpoint string itself.
5. Set these in Vercel (replacing the MinIO-shaped local-dev values):
   ```
   STORAGE_ENDPOINT=https://s3.<region-code>.backblazeb2.com
   STORAGE_BUCKET=<your bucket name>
   STORAGE_ACCESS_KEY=<the keyID>
   STORAGE_SECRET_KEY=<the applicationKey>
   STORAGE_REGION=<region-code>
   ```
   **This is a real, concrete difference from R2, not a cosmetic one:**
   `STORAGE_REGION` here is the **actual region code from your endpoint**
   (e.g. `us-west-004`), *not* the literal string `auto` R2 uses — B2 is a
   real-region provider (an account is pinned to one region; you can't
   create buckets outside it), whereas R2 has no regions at all. Using
   `auto` against B2 would produce a SigV4 signature-scope mismatch.
6. **Checksum compatibility — researched, not assumed to carry over from
   R2:** the same `aws-sdk` v3 "flexible checksums" issue that affects R2
   (client default `WHEN_SUPPORTED` attaches a trailing CRC32 checksum to
   every `PutObject`) turned out to have affected B2 too — B2 rejected the
   `x-amz-checksum-crc32` header with "Unsupported header" errors in
   multiple independent reports from Jan-Mar 2025. **Backblaze fixed this
   server-side in July 2025**, so current B2 accounts should accept the
   checksum header fine. `lib/storage/s3.ts` still sets
   `requestChecksumCalculation: "WHEN_REQUIRED"` unconditionally — it's a
   strict subset of the SDK default (only sends a checksum when an
   operation strictly mandates one), so it can't regress B2 either way,
   fixed or not. **You don't need to do anything for this** — it's already
   in the code — but if you ever see an "Unsupported header" upload error
   against B2, it means either this setting got reverted or you're on
   unusually old B2-side infrastructure; check the setting first.
7. `forcePathStyle` is already handled correctly and needed no change for
   B2: it's on whenever `STORAGE_ENDPOINT` is set, and B2's own S3-compatible
   API docs confirm it supports specifying the bucket name in the path (in
   addition to the hostname), so path-style addressing works against B2.
8. Signed URLs (`getSignedGetUrl`) use the same configured client for both
   writing and reading. B2's own help docs confirm the S3-compatible API
   supports pre-signed URLs and v4-only signatures (matching what
   `@aws-sdk/s3-request-presigner` generates) — but this wasn't separately
   re-verified against a real B2 bucket (no account was available during
   this build). **This is the first real thing to test on your first
   deploy**: upload a complaint photo and confirm the citizen
   complaint-detail page actually loads it via the signed URL, not just
   that the upload itself succeeds.

### Option B — Cloudflare R2 (still supported, needs a card)

R2's free tier requires a credit card on file (confirmed against R2's own
community forum — this contradicts R2's marketing copy, which is why B2 is
now the primary recommendation above). If you have a card and prefer R2
anyway, the code path is unchanged from before:

1. Create a free Cloudflare account, then an R2 bucket (R2 dashboard →
   Create bucket).
2. Create an R2 API token (R2 dashboard → Manage API tokens → Create API
   token) scoped to that bucket, with read+write (Object Read & Write)
   permissions — gives you an Access Key ID and Secret Access Key.
3. Find your R2 **Account ID** (Cloudflare dashboard sidebar, or the R2
   overview page) — needed for the endpoint URL below.
4. Set these in Vercel:
   ```
   STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
   STORAGE_BUCKET=<your bucket name>
   STORAGE_ACCESS_KEY=<the Access Key ID>
   STORAGE_SECRET_KEY=<the Secret Access Key>
   STORAGE_REGION=auto
   ```
   `STORAGE_REGION=auto` is the literal value R2 requires (not a
   placeholder) — R2 has no AWS-style regions, but the SDK's SigV4 signing
   needs some region string.
5. The same `requestChecksumCalculation: "WHEN_REQUIRED"` fix in
   `lib/storage/s3.ts` covers R2 too (that's the provider it was originally
   written for) — nothing further to configure.

## 3. Inference service — Hugging Face Spaces (or Render, documented fallback)

**A real gotcha this repo's own `.gitignore` creates, worth reading before
you start:** `services/inference/models/best.pt` and `best.onnx` are
deliberately excluded from this repo's git history (see
`.gitignore` — "distribute separately"). A Hugging Face Space **is its own
separate git repository** — pushing this GitHub repo's `main` branch to it
will silently **not** include the model file, and the Docker build will
fail (or worse, build with `YOLO_MODEL_PATH` pointing at a file that
doesn't exist). You must add the model file to the Space's own repo
specifically, by one of:
- `git add -f services/inference/models/best.onnx` when committing
  **inside the Space's own git remote** (bypasses your local `.gitignore`
  for that one push — this does not affect the main GitHub repo, since
  it's a different remote/history entirely), or
- Uploading `best.onnx` directly through the Space's web UI (Files tab →
  Add file → Upload), which sidesteps git entirely.

### Option A — Hugging Face Spaces (primary)

1. Create a free Hugging Face account, then a new Space
   ([huggingface.co/new-space](https://huggingface.co/new-space)) with
   **SDK: Docker**. This creates a Space with its own git remote.
2. Push `services/inference/`'s contents to the Space's git remote as the
   repo root (i.e., the Space's `Dockerfile` must be at its own repo root,
   not nested under `services/inference/`) — either `git subtree push` /
   `git filter-repo` from this monorepo, or simplest for a one-time
   hackathon push: copy the `services/inference/` directory's contents
   into a fresh local folder, `git init` there, add the Space as the
   remote, and push that.
3. **Add the model file** per the gotcha above — this step is easy to
   skip and the failure mode (a build that succeeds but a model that
   never loads, or a build that fails on a missing `COPY` source) isn't
   obvious from the Space's build log alone if you don't know to look for
   it.
4. The `README.md` already committed in `services/inference/` has the
   required Hugging Face YAML frontmatter (`sdk: docker`, `app_port:
   7860`) — no extra Space configuration needed beyond what's already in
   this repo.
5. The `Dockerfile` already defaults to `YOLO_RUNTIME=onnx` /
   `YOLO_MODEL_PATH=./models/best.onnx` — HF Spaces' free tier is CPU-only,
   and CLAUDE.md §6 calls the ONNX path "the lighter-weight/CPU-friendly
   deployment option" for exactly this reason. `requirements-deploy.txt`
   (used by the Dockerfile, not the same file as local dev's
   `requirements.txt`) deliberately excludes `ultralytics`/`torch` — the
   `.pt` runtime path is never imported when `YOLO_RUNTIME=onnx`
   (`app/model_loader.py`'s runtime selection is a lazy import), so that
   multi-hundred-MB dependency would be dead weight in a free-tier image.
6. **Verified locally, not against a real Space** (no HF account
   available): `docker build` on this exact `Dockerfile` succeeds, and the
   resulting image — run locally on port 7860 as the same non-root `uid
   1000` user HF Spaces itself uses — serves `/health` with
   `model_loaded: true` and a real `/infer` call against a real test image
   returns real detections and a servable annotated image. This is as far
   as this could be verified without a Hugging Face account; the actual
   Space build (network conditions, HF's specific build environment) is
   the one thing that genuinely can't be confirmed until you deploy it.
7. Once deployed, your Space's public URL is
   `https://<your-username>-<space-name>.hf.space` — this is what
   `INFERENCE_SERVICE_URL` (below) points at.
8. Spaces spin down when idle (free tier) — the first request after a
   period of inactivity will be slow (cold start, loading the model into
   memory) rather than failing; "wake it" with a manual `/health` request
   a few minutes before a live demo rather than relying on the first real
   citizen submission to also be the cold-start request.

### Option B — Render free web service (documented fallback)

Same `Dockerfile` works here too, with one difference already handled in
it: Render injects its own `$PORT` (commonly `10000`) rather than using a
fixed port, and the Dockerfile's `CMD` already respects `${PORT:-7860}` —
no Dockerfile change needed to switch between the two targets.

1. Create a free Render account, then a new Web Service, "Build and
   deploy from a Dockerfile", pointed at wherever you've pushed
   `services/inference/` (a GitHub repo Render can access — this can
   stay part of the same GitHub repo as everything else, unlike HF
   Spaces; set the service's **Root Directory** to `services/inference`
   so Render finds the `Dockerfile` there without a separate repo).
2. The same model-file gotcha applies here in reverse: if
   `services/inference/models/*.onnx` stays gitignored in the repo Render
   deploys from, the build will fail the same way. Either commit the
   model file to a dedicated deployment branch (not `main`, to keep the
   general-purpose repo binary-free) or use Render's own file-upload/
   persistent-disk options.
3. Render's free web services also spin down when idle — same cold-start
   consideration as Spaces above.
4. Your service URL will be `https://<service-name>.onrender.com` — same
   role as the Spaces URL below.

### Pointing the web app at whichever you used

```
INFERENCE_SERVICE_URL=https://<your-username>-<space-name>.hf.space
# or, if using Render instead:
INFERENCE_SERVICE_URL=https://<service-name>.onrender.com
```

## 4. Web app — Vercel

1. Import this GitHub repo into a new Vercel project (free Hobby plan).
   Vercel auto-detects the Next.js app; set the project's **Root
   Directory** to `apps/web` (this is a monorepo — Vercel needs to know
   `apps/web`, not the repo root, is where `next build` runs).
2. Set every env var from `apps/web/.env.example` in the Vercel project's
   Environment Variables settings, with real production values:
   - `DATABASE_URL` — Neon's **pooled** connection string (§1 above).
   - `NEXTAUTH_SECRET` — generate a real random value (e.g.
     `openssl rand -base64 32`), never reuse the local-dev placeholder.
   - `NEXTAUTH_URL` — your real Vercel deployment URL (e.g.
     `https://your-app.vercel.app`) — this is baked into every auth
     callback and every link in transactional emails; get it right before
     the first real login, not after.
   - `JWT_SECRET` — another real random value.
   - `STORAGE_ENDPOINT` / `STORAGE_BUCKET` / `STORAGE_ACCESS_KEY` /
     `STORAGE_SECRET_KEY` / `STORAGE_REGION` — the B2 (or R2) values from §2.
   - `NEXT_PUBLIC_MAP_TILE_PROVIDER=osm` (CLAUDE.md §13: OSM-only was the
     resolved decision — leave this as-is, no Mapbox token needed).
   - `INFERENCE_SERVICE_URL` — from §3 above.
   - `EMAIL_PROVIDER=resend`, `EMAIL_PROVIDER_API_KEY` — a real Resend
     API key if you want real emails sent; leave the key unset to keep
     the console-log fallback (fine for a hackathon demo where you're
     watching Vercel's function logs anyway).
   - `EMAIL_FROM` — e.g. `Ecora <no-reply@yourdomain.example>` (Resend
     requires a domain you've verified with them to send from a custom
     address; without that, use Resend's own sandbox sender address
     instead for the demo).
3. **`maxDuration` — already configured in code, nothing to set in
   Vercel's UI for this.** `app/complaints/new/page.tsx` and
   `app/admin/(protected)/complaints/[number]/page.tsx` (the two route
   segments that invoke synchronous-inference server actions) both
   explicitly export `maxDuration = 60`. Real measured inference time
   locally was ~6.7s (see `PROGRESS.md`), so 60s leaves comfortable
   headroom for a cold Hugging Face Space / Render instance on top of
   that. (Vercel's own current Hobby-plan default is actually more
   generous than 60s already — but this is set explicitly rather than
   relying on whatever the platform default happens to be at deploy
   time, since that default has changed more than once in Vercel's own
   changelog.) A `maxDuration` this low is not configurable via
   environment variable by Next.js's own design (it must be a literal
   number in the route segment file) — if you ever need to change it,
   edit those two files directly, not an env var.
4. Deploy. First deploy will run `next build` against the real
   `DATABASE_URL`/`STORAGE_*` env vars — if a build-time step ever tries
   to touch the database or storage (none currently do; all data access
   in this app is request-time, not build-time), that's the first place
   a misconfigured env var would surface.

## 5. First-deploy smoke test

Once all four pieces are live:
1. Register a citizen account, submit a complaint with a real photo.
   Expect the ~7-10s wait (real inference now runs in-request) and a
   final status of "Under Review" on the success page.
2. Log in as an admin (see `infra/db/seed/demo_data.sql` or create one
   directly via SQL against the Neon direct connection — there's no
   self-service admin signup, by design, CLAUDE.md §11) and confirm the
   complaint shows a real annotated image and real detections.
3. If a complaint gets stuck at "AI Analysis Pending" (a cold-starting
   inference service timing out on the very first request is the most
   likely cause on a hackathon demo), use the admin "Retry AI analysis"
   button — this is the deployment's whole recovery story for a
   transient inference failure; see `PROGRESS.md`'s Part 1 entry for why
   no queue/cron-based retry was built instead.
