import { afterEach, describe, expect, it, vi } from "vitest";

// Regression test for a real production incident: register() used to bail
// out unless NEXT_RUNTIME was *exactly* "nodejs", which silently disabled
// the entire reminders + CallRail-poll scheduler for days with zero error
// output, the moment Hostinger's process launcher left NEXT_RUNTIME unset
// or gave it something other than the literal string "nodejs". The fix
// only excludes the one runtime that genuinely can't run this code (Edge),
// which is what these tests pin down.
describe("instrumentation.register", () => {
  const originalEnv = process.env.NEXT_RUNTIME;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NEXT_RUNTIME;
    else process.env.NEXT_RUNTIME = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("arms the scheduler when NEXT_RUNTIME is 'nodejs'", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockReturnValue(0 as never);

    const { register } = await import("@/instrumentation");
    register();

    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalled();
  });

  it("arms the scheduler when NEXT_RUNTIME is unset — the exact production failure mode", async () => {
    delete process.env.NEXT_RUNTIME;
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockReturnValue(0 as never);

    const { register } = await import("@/instrumentation");
    register();

    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalled();
  });

  it("does not arm the scheduler on the Edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval").mockReturnValue(0 as never);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockReturnValue(0 as never);

    const { register } = await import("@/instrumentation");
    register();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
