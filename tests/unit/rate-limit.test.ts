describe("lib/rate-limit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests until the window limit is reached", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");

    expect(checkRateLimit("1.2.3.4", 2, 60_000)).toEqual({
      allowed: true,
      retryAfterMs: 0,
    });
    expect(checkRateLimit("1.2.3.4", 2, 60_000)).toEqual({
      allowed: true,
      retryAfterMs: 0,
    });

    const limited = checkRateLimit("1.2.3.4", 2, 60_000);
    expect(limited.allowed).toBe(false);
    expect(limited.retryAfterMs).toBeGreaterThan(0);
  });

  it("allows requests again after the window expires", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");

    expect(checkRateLimit("5.6.7.8", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("5.6.7.8", 1, 60_000).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit("5.6.7.8", 1, 60_000)).toEqual({
      allowed: true,
      retryAfterMs: 0,
    });
  });
});
