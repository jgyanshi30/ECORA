import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** CLAUDE.md §11: bcrypt/argon2 password hashing — never store plaintext. */
export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

export function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
