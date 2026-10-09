import { afterEach, describe, expect, it, vi } from "vitest";

// register() is intentionally a no-op: the reminders + CallRail-poll
// scheduler needs a live database, and the public site no longer has one.
// These tests pin that down so a background job can't silently start (and
// start failing against a missing database) in any runtime.
describe("instrumentation.register", () => {
  const originalEnv = process.env.NEXT_RUNTIME;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it.each(["nodejs", "edge", undefined])(
    "does not arm any background timers when NEXT_RUNTIME is %s",
    async (runtime) => {
      if (runtime === undefined) delete process.env.NEXT_RUNTIME;
      else process.env.NEXT_RUNTIME = runtime;
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockReturnValue(0 as never);

      const { register } = await import("@/instrumentation");
      register();

      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    },
  );
});
