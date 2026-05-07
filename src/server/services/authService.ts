import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = "15m";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign({ sub: userId }, secret, {
    expiresIn: TOKEN_EXPIRY,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): { sub: string } {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, secret) as { sub: string };
}

export function generateRawToken(): string {
  return crypto.randomUUID();
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function verificationExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d;
}

export function resetExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d;
}
