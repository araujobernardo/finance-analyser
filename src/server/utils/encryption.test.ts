import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { encrypt, decrypt } from "./encryption.ts";

const VALID_KEY = "a".repeat(64); // 64 hex chars = 32 bytes

describe("encryption utility", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("encrypt", () => {
    it("returns a base64 string, never the original plaintext", () => {
      const result = encrypt("hello world");
      expect(result).not.toBe("hello world");
      // Valid base64 — should not throw when decoded
      expect(() => Buffer.from(result, "base64")).not.toThrow();
    });

    it("returns different ciphertext on each call (random IV)", () => {
      const first = encrypt("same plaintext");
      const second = encrypt("same plaintext");
      expect(first).not.toBe(second);
    });
  });

  describe("decrypt", () => {
    it("decrypt(encrypt(s)) === s for any string", () => {
      const plaintext = "my secret token";
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("round-trips an empty string", () => {
      expect(decrypt(encrypt(""))).toBe("");
    });

    it("round-trips a long string", () => {
      const long = "x".repeat(1000);
      expect(decrypt(encrypt(long))).toBe(long);
    });

    it("round-trips a string with special characters", () => {
      const special = "user_token_abc123!@#$%^&*()_+-=[]{}|;':\",./<>?";
      expect(decrypt(encrypt(special))).toBe(special);
    });
  });

  describe("key validation", () => {
    it("throws a descriptive error if ENCRYPTION_KEY is missing", () => {
      vi.unstubAllEnvs();
      vi.stubEnv("ENCRYPTION_KEY", "");
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be");
    });

    it("throws a descriptive error if ENCRYPTION_KEY is wrong length", () => {
      vi.unstubAllEnvs();
      vi.stubEnv("ENCRYPTION_KEY", "abc123");
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY must be");
    });

    it("throws on decrypt if ENCRYPTION_KEY is missing", () => {
      const ciphertext = encrypt("test");
      vi.unstubAllEnvs();
      vi.stubEnv("ENCRYPTION_KEY", "");
      expect(() => decrypt(ciphertext)).toThrow("ENCRYPTION_KEY must be");
    });
  });
});
