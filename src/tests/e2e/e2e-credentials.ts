// Shared between global-setup.ts (creates this user) and crm.spec.ts (logs
// in as this user). Not a real account — created fresh before the E2E run
// and fully deleted afterward by global-teardown.ts.
export const E2E_OWNER_EMAIL = "e2e-test-owner@example.com";
export const E2E_OWNER_PASSWORD = "E2E-Test-Password-1";
export const E2E_NAME_PREFIX = "E2E Test";
