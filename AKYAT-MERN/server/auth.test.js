import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, tokenHash, validateCredentials, verifyPassword } from "./auth.js";

test("signup normalizes email and validates fields", () => {
  assert.deepEqual(validateCredentials({ name: "  Eli  ", email: " ELI@Example.com ", password: "password123" }, true), { name: "Eli", email: "eli@example.com", password: "password123" });
  assert.throws(() => validateCredentials({ name: "", email: "bad", password: "short" }, true));
});
test("password hashes verify without storing plaintext", async () => {
  const hash = await hashPassword("password123");
  assert.equal(hash.includes("password123"), false);
  assert.equal(await verifyPassword("password123", hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(await verifyPassword("password123", "invalid"), false);
});
test("session token hash is deterministic", () => assert.equal(tokenHash("abc"), tokenHash("abc")));
