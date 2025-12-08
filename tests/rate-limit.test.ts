import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("should allow requests under limit", () => {
    const result = checkRateLimit("test-key", {
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should track request count", () => {
    const config = { windowMs: 60_000, maxRequests: 5 };

    checkRateLimit("count-key", config);
    checkRateLimit("count-key", config);
    const result = checkRateLimit("count-key", config);

    expect(result.remaining).toBe(2);
  });

  it("should block requests over limit", () => {
    const config = { windowMs: 60_000, maxRequests: 3 };

    checkRateLimit("block-key", config);
    checkRateLimit("block-key", config);
    checkRateLimit("block-key", config);
    const result = checkRateLimit("block-key", config);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should reset after window expires", () => {
    const config = { windowMs: 60_000, maxRequests: 2 };

    checkRateLimit("reset-key", config);
    checkRateLimit("reset-key", config);
    const blocked = checkRateLimit("reset-key", config);
    expect(blocked.allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    const allowed = checkRateLimit("reset-key", config);
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(1);
  });

  it("should isolate different keys", () => {
    const config = { windowMs: 60_000, maxRequests: 2 };

    checkRateLimit("key-a", config);
    checkRateLimit("key-a", config);
    const blockedA = checkRateLimit("key-a", config);

    const allowedB = checkRateLimit("key-b", config);

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });
});
