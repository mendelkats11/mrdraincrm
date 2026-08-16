import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/tests/unit/**/*.test.{ts,tsx}", "src/tests/integration/**/*.test.{ts,tsx}"],
    // Integration tests spin up a fresh embedded Postgres (PGlite) and
    // apply real migrations — slower than a pure unit test.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
