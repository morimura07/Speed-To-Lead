import { createHash, randomBytes } from 'node:crypto';
import { customAlphabet } from 'nanoid';

/**
 * Opaque secret tokens (refresh tokens, password-reset tokens).
 *
 * We hand the raw token to the client but persist only its SHA-256 digest, so a
 * database leak never exposes usable tokens. SHA-256 (not Argon2) is correct
 * here: these are already high-entropy random values, and we need a fast,
 * deterministic digest to look them up.
 */
export function generateOpaqueToken(byteLength = 48): string {
  return randomBytes(byteLength).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * License key generator. Uses an unambiguous alphabet (no 0/O/1/I) so keys are
 * easy to read aloud and retype. Format: LA-XXXX-XXXX-XXXX.
 */
const KEY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const keySegment = customAlphabet(KEY_ALPHABET, 4);

export function generateLicenseKey(): string {
  return `LA-${keySegment()}-${keySegment()}-${keySegment()}`;
}
