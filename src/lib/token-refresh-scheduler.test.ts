import { describe, expect, it, vi } from "vitest";
import { createTokenRefreshScheduler } from "./token-refresh-scheduler";

describe("token refresh scheduler", () => {
  it("queues an immediate background refresh when enabled", () => {
    const refreshAllTokens = vi.fn(async () => [
      { email: "ops@example.com", expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
    ]);
    const setTimer = vi.fn();

    const scheduler = createTokenRefreshScheduler({
      refreshAllTokens,
      setTimer,
      clearTimer: vi.fn(),
      now: () => new Date(0)
    });

    scheduler.configure(true);

    expect(refreshAllTokens).not.toHaveBeenCalled();
    expect(setTimer).toHaveBeenCalledWith(expect.any(Function), 0);
  });

  it("schedules before the next expiry after the background refresh finishes", async () => {
    const refreshAllTokens = vi.fn(async () => [
      { email: "ops@example.com", expiresAt: new Date(Date.now() + 60 * 60 * 1000) }
    ]);
    const setTimer = vi.fn();

    const scheduler = createTokenRefreshScheduler({
      refreshAllTokens,
      setTimer,
      clearTimer: vi.fn(),
      now: () => new Date(0)
    });

    scheduler.configure(true);
    const immediateRefresh = setTimer.mock.calls[0]?.[0];
    immediateRefresh();
    await Promise.resolve();

    expect(refreshAllTokens).toHaveBeenCalledOnce();
    expect(setTimer.mock.calls[1]?.[1]).toBeGreaterThanOrEqual(49 * 60 * 1000);
  });

  it("clears the pending timer when disabled", async () => {
    const clearTimer = vi.fn();
    const scheduler = createTokenRefreshScheduler({
      refreshAllTokens: vi.fn(),
      setTimer: vi.fn(),
      clearTimer,
      now: () => new Date()
    });

    scheduler.configure(false);

    expect(clearTimer).toHaveBeenCalledOnce();
  });
});
