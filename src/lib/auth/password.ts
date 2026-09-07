import bcrypt from "bcryptjs";

// Cost factor 12: the current baseline recommendation for bcrypt (OWASP)
// balancing brute-force resistance against per-request latency.
const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
