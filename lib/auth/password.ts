import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const trimmedPlain = typeof plain === "string" ? plain.trim() : "";
  const trimmedHash = typeof hash === "string" ? hash.trim() : "";
  if (!trimmedPlain || !trimmedHash) return false;
  if (!trimmedHash.startsWith("$2")) return false; // bcrypt hashes start with $2a$, $2b$, etc.
  try {
    return await bcrypt.compare(trimmedPlain, trimmedHash);
  } catch {
    return false;
  }
}
