import { db } from "@/lib/db";

export async function findUserByEmail(email: string) {
  return db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst();
}

export async function findUserById(id: string) {
  return db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst();
}

export async function createCitizenUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
}) {
  return db
    .insertInto("users")
    .values({
      email: input.email,
      password_hash: input.passwordHash,
      full_name: input.fullName,
      phone: input.phone,
      role: "citizen",
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
