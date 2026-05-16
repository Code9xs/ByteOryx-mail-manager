type RefreshResult = { email: string; expiresAt: Date };

export function createTokenRefreshScheduler({
  refreshAllTokens,
  setTimer,
  clearTimer,
  now
}: {
  refreshAllTokens(): Promise<RefreshResult[]>;
  setTimer(callback: () => void, ms: number): unknown;
  clearTimer(): void;
  now(): Date;
}) {
  async function runAndSchedule() {
    const results = await refreshAllTokens();
    const nextExpiry = results
      .map((result) => result.expiresAt.getTime())
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0];

    const fallback = 50 * 60 * 1000;
    const delay = nextExpiry
      ? Math.max(60 * 1000, nextExpiry - now().getTime() - 10 * 60 * 1000)
      : fallback;

    setTimer(() => {
      void runAndSchedule();
    }, delay);
  }

  return {
    configure(enabled: boolean) {
      clearTimer();
      if (enabled) {
        setTimer(() => {
          void runAndSchedule();
        }, 0);
      }
    }
  };
}
