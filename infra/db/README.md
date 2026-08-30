# infra/db

PostgreSQL + PostGIS schema for Ecora, plus the local-dev MinIO
(S3-compatible object storage) container used to store complaint images.
`docker compose up -d` starts both — MinIO's S3 API is on `:9000` (matches
`STORAGE_ENDPOINT`), its web console on `:9001` (`http://localhost:9001`,
login `minioadmin` / `minioadmin123`), and the `minio-init` service creates
the `ecora-uploads` bucket automatically.

## Layout

- `migrations/` — numbered, forward-only SQL files. Applied in order by
  `docker-entrypoint-initdb.d` on first container start (only runs against an
  empty data volume). Includes required reference data (`debris_classes`,
  `roles`, `treatment_recommendations` defaults, seeded inline since the
  schema depends on it via foreign keys) — this is real reference config,
  not the synthetic "demo data" below.
- `seed/demo_data.sql` — synthetic local-dev fixtures only (labeled `[DEMO]`
  throughout). Not auto-applied. Never run against staging/production.

## Local dev

```bash
cd infra/db
docker compose up -d
docker compose logs -f db   # watch migrations apply on first boot
```

Apply demo fixtures (optional, local dev only):

```bash
docker compose exec -T db psql -U user -d ecora -f /seed/demo_data.sql
```

Connect:

```bash
docker compose exec db psql -U user -d ecora
```

## Re-running migrations from scratch

`docker-entrypoint-initdb.d` only runs on an empty volume. To reset:

```bash
docker compose down -v
docker compose up -d
```

## Adding a migration

Add a new `NNNN_description.sql` file with the next number. Never edit an
already-applied numbered file — add a new one, even for a fix.
