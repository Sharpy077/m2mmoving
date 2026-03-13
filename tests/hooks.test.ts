// @vitest-environment jsdom
/**
 * Custom React Hook Tests
 *
 * Tests for useFormPersistence, useErrorRecovery, and useIsMobile.
 */
import { renderHook, act } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFormPersistence } from "@/hooks/use-form-persistence"
import { useErrorRecovery } from "@/hooks/use-error-recovery"
import { useIsMobile } from "@/hooks/use-mobile"

// ─────────────────────────────────────────────────────────────────────────────
// useFormPersistence
// ─────────────────────────────────────────────────────────────────────────────
describe("useFormPersistence()", () => {
  const STORAGE_KEY = "test-form-data"

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("saves form data to localStorage when formData changes", () => {
    const formData = { name: "Test Corp", email: "test@corp.com" }
    renderHook(() => useFormPersistence(formData, STORAGE_KEY, true))

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    // New format wraps data in { data, savedAt }
    expect(parsed).toHaveProperty("data")
    expect(parsed.data).toEqual(formData)
    expect(typeof parsed.savedAt).toBe("number")
  })

  it("loadSavedData reads back the data that the hook most recently saved", () => {
    // The hook's effect writes formData to localStorage on mount.
    // loadSavedData should return data fields plus a _savedAt timestamp.
    const formData = { name: "Test Corp", email: "corp@example.com" }
    const { result } = renderHook(() => useFormPersistence(formData, STORAGE_KEY, true))
    const loaded = result.current.loadSavedData()
    expect(loaded).not.toBeNull()
    expect(loaded!.name).toBe(formData.name)
    expect(loaded!.email).toBe(formData.email)
    expect(typeof (loaded as any)._savedAt).toBe("number")
  })

  it("loadSavedData returns null when nothing is in localStorage", () => {
    const { result } = renderHook(() =>
      useFormPersistence<{ name: string }>({ name: "" }, STORAGE_KEY, true),
    )
    // Clear the key that was just written by the hook effect
    localStorage.removeItem(STORAGE_KEY)
    const loaded = result.current.loadSavedData()
    expect(loaded).toBeNull()
  })

  it("clearSavedData removes the entry from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 2 }))
    const { result } = renderHook(() =>
      useFormPersistence<{ step: number }>({ step: 1 }, STORAGE_KEY, true),
    )
    act(() => {
      result.current.clearSavedData()
    })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("does not write to localStorage when disabled", () => {
    localStorage.clear()
    renderHook(() => useFormPersistence({ name: "Hidden" }, STORAGE_KEY, false))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("loadSavedData returns null when hook is disabled", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: "Should Not Load" }))
    const { result } = renderHook(() =>
      useFormPersistence<{ name: string }>({ name: "" }, STORAGE_KEY, false),
    )
    expect(result.current.loadSavedData()).toBeNull()
  })

  it("handles corrupted localStorage gracefully by returning null", () => {
    const { result } = renderHook(() =>
      useFormPersistence<{ name: string }>({ name: "" }, STORAGE_KEY, true),
    )
    // Corrupt the stored value after the hook has mounted
    localStorage.setItem(STORAGE_KEY, "{not valid json}")
    expect(result.current.loadSavedData()).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useErrorRecovery
// ─────────────────────────────────────────────────────────────────────────────
describe("useErrorRecovery()", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("executes the async function and returns the result on success", async () => {
    const asyncFn = vi.fn().mockResolvedValue("data")
    const { result } = renderHook(() => useErrorRecovery(asyncFn, { maxRetries: 3 }))

    let value: unknown
    await act(async () => {
      value = await result.current.execute()
    })

    expect(value).toBe("data")
    expect(asyncFn).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeNull()
  })

  it("retries the specified number of times on failure before giving up", async () => {
    const asyncFn = vi.fn().mockRejectedValue(new Error("fail"))
    const { result } = renderHook(() =>
      useErrorRecovery(asyncFn, { maxRetries: 3, retryDelay: 100 }),
    )

    await act(async () => {
      // Attach .catch(() => undefined) to prevent unhandled-rejection warnings;
      // the final error is surfaced via result.current.error instead.
      const promise = result.current.execute().catch(() => undefined)
      await vi.runAllTimersAsync()
      await promise
    })

    expect(asyncFn).toHaveBeenCalledTimes(3)
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it("sets error state after exhausting all retries", async () => {
    const error = new Error("permanent failure")
    const asyncFn = vi.fn().mockRejectedValue(error)
    const { result } = renderHook(() =>
      useErrorRecovery(asyncFn, { maxRetries: 2, retryDelay: 50 }),
    )

    await act(async () => {
      const promise = result.current.execute().catch(() => undefined)
      await vi.runAllTimersAsync()
      await promise
    })

    expect(result.current.error?.message).toBe("permanent failure")
    expect(result.current.isRetrying).toBe(false)
  })

  it("resets error and retryCount to 0 after a successful execution", async () => {
    let callCount = 0
    const asyncFn = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.reject(new Error("first fail"))
      return Promise.resolve("ok")
    })
    const { result } = renderHook(() =>
      useErrorRecovery(asyncFn, { maxRetries: 3, retryDelay: 10 }),
    )

    await act(async () => {
      const promise = result.current.execute()
      await vi.runAllTimersAsync()
      await promise
    })

    expect(result.current.error).toBeNull()
    expect(result.current.retryCount).toBe(0)
  })

  it("calls onRetry callback on each retry attempt", async () => {
    const onRetry = vi.fn()
    const asyncFn = vi.fn().mockRejectedValue(new Error("fail"))
    const { result } = renderHook(() =>
      useErrorRecovery(asyncFn, { maxRetries: 3, retryDelay: 10, onRetry }),
    )

    await act(async () => {
      const promise = result.current.execute().catch(() => undefined)
      await vi.runAllTimersAsync()
      await promise
    })

    // onRetry is called for each failed attempt except the last (3 attempts = 2 retries)
    expect(onRetry).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useIsMobile
// ─────────────────────────────────────────────────────────────────────────────
describe("useIsMobile()", () => {
  function setViewportWidth(width: number) {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    })
  }

  function mockMatchMedia(matches: boolean) {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    const mql = {
      matches,
      addEventListener: (_event: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb)
      },
      removeEventListener: vi.fn(),
      // Expose listeners so tests can fire change events
      _listeners: listeners,
    }
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue(mql),
    })
    return mql
  }

  it("returns true when viewport width is below 768px (mobile)", () => {
    setViewportWidth(375)
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it("returns false when viewport width is 768px or above (desktop)", () => {
    setViewportWidth(1024)
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it("returns false at exactly the 768px breakpoint", () => {
    setViewportWidth(768)
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })
})
