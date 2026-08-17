import "@testing-library/jest-dom/vitest";

// Fixed test-only secret so session cookie signing (src/lib/auth/session-token.ts)
// has something to sign with — never used outside the test run.
process.env.SESSION_SECRET ??= "test-session-secret-not-for-production-use-only-in-tests";
