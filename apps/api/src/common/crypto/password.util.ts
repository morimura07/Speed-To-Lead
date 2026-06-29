import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing using Argon2id — a memory-hard algorithm resistant to GPU
 * cracking. Parameters follow current OWASP guidance.
 */
const ARGON_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain, ARGON_OPTIONS);
  } catch {
    // A malformed/incompatible hash should read as "does not match", not crash.
    return false;
  }
}
