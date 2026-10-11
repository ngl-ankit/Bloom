import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

/** scrypt with per-password random salt: salt:hash (hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, KEYLEN);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const hash = await scrypt(password, salt, KEYLEN);
  const expected = Buffer.from(hex, "hex");
  return expected.length === hash.length && timingSafeEqual(hash, expected);
}

export function passwordProblems(pw: string): string[] {
  const problems: string[] = [];
  if (pw.length < 10) problems.push("at least 10 characters");
  if (!/[a-zA-Z]/.test(pw)) problems.push("a letter");
  if (!/[0-9]/.test(pw)) problems.push("a number");
  return problems;
}
