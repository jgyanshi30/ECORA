import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Database } from "./db-types";

// Next.js dev-mode hot-reloads route modules; without a global singleton
// guard each reload would open a fresh pg.Pool and leak connections.
const globalForDb = globalThis as unknown as { __ecoraDb?: Kysely<Database> };

export const db =
  globalForDb.__ecoraDb ??
  new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
    }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ecoraDb = db;
}
