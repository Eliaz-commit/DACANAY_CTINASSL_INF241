import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hikers book trips; operators run them. Like the capstone, a new account is a hiker unless it says otherwise. */
export const ROLES = ["hiker", "operator"];

/** Accounts made before roles existed were all operator accounts. */
export const roleOf = (user) => (ROLES.includes(user?.role) ? user.role : "operator");

export function validateCredentials(input, signup = false) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Enter your email and password.");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = input.password;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (email.length > 254 || !emailPattern.test(email)) throw new Error("Enter a valid email address.");
  if (typeof password !== "string" || password.length < 8 || password.length > 128)
    throw new Error("Password must be 8 to 128 characters.");
  if (signup && (!name || name.length > 80)) throw new Error("Enter a name up to 80 characters.");
  const role = input.role ?? "hiker";
  if (signup && !ROLES.includes(role)) throw new Error("Choose a hiker or operator account.");
  return { email, password, ...(signup ? { name, role } : {}) };
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return false;
  const [salt, expectedHex] = stored.split(":");
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expectedHex, "hex"));
}

export const newToken = () => randomBytes(32).toString("hex");
export const tokenHash = (token) => createHash("sha256").update(token).digest("hex");
