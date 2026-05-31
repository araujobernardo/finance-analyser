import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption utility.
 *
 * Key: process.env.ENCRYPTION_KEY — 64-char hex string (32 bytes)
 * encrypt output: base64( iv[12 bytes] || authTag[16 bytes] || ciphertext )
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // bytes
const AUTH_TAG_LENGTH = 16; // bytes

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64 string: iv (12 bytes) + authTag (16 bytes) + ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Layout: iv || authTag || ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a base64 string produced by encrypt().
 * Returns the original plaintext.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
