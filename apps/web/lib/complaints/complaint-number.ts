import { generateComplaintNumberCandidate } from "@ecora/shared";
import type { Kysely, Transaction } from "kysely";

import type { Database } from "@/lib/db-types";

const MAX_ATTEMPTS = 8;

/**
 * Generates a complaint number and reserves it with a real INSERT, racing
 * safely against any concurrent submission via the DB's own UNIQUE
 * constraint (CLAUDE.md §4) rather than a check-then-insert TOCTOU race.
 * `ON CONFLICT ... DO NOTHING` means a collision inserts nothing and this
 * retries with a fresh candidate; collisions are astronomically unlikely
 * (36^6 candidates/day) so MAX_ATTEMPTS is just a safety net, not a realistic
 * exhaustion path.
 *
 * `generateCandidate` is injectable for tests that need to force a collision
 * deterministically instead of relying on crypto-random luck.
 */
export async function insertComplaintWithUniqueNumber(
  trx: Kysely<Database> | Transaction<Database>,
  row: { id: string; citizen_id: string; location_id: string; description: string | null },
  generateCandidate: () => string = generateComplaintNumberCandidate
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateCandidate();
    const inserted = await trx
      .insertInto("complaints")
      .values({
        id: row.id,
        complaint_number: candidate,
        citizen_id: row.citizen_id,
        location_id: row.location_id,
        status: "SUBMITTED",
        description: row.description,
      })
      .onConflict((oc) => oc.column("complaint_number").doNothing())
      .returning("complaint_number")
      .executeTakeFirst();

    if (inserted) return inserted.complaint_number;
  }

  throw new Error(`Could not generate a unique complaint number after ${MAX_ATTEMPTS} attempts.`);
}
