import { hash, verify } from "@node-rs/argon2";

// argon2id via @node-rs/argon2 (Rust-backed, prebuilt binaries) —
// docs/IMPLEMENTATION_PLAN.md §8: "do not build password hashing... from
// scratch." Default cost parameters from the library are current
// OWASP-aligned argon2id recommendations; not overridden.

export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

// A hash of a fixed, never-used password. Verifying against this when a
// login targets a nonexistent email keeps argon2's (deliberately slow)
// verify step on the same code path either way, so response timing does
// not become an oracle for "does this email have an account" — see
// src/lib/auth/login.ts.
let dummyHashPromise: Promise<string> | undefined;

export function getDummyPasswordHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hash("dummy-password-never-used-for-timing-parity");
  }
  return dummyHashPromise;
}
